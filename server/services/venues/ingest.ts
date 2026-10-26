import { useDrizzle } from "#imports";
import { venueSources, insertVenueSourceSchema } from "~~/server/db/schemas";
import { eq } from "drizzle-orm";
import type { ScrapingSourceAdapter } from "../scraping/sources/types";
import type { PlaceData, ActivityData, CityData } from "../scraping/parser";
import {
  normalizeAddressFromPlace,
  upsertCityAndAddress,
} from "../location/normalize";

export interface IngestionInput {
  source: ScrapingSourceAdapter;
  activity: ActivityData;
  city: CityData;
  places: PlaceData[];
}

export interface IngestionResult {
  ingested: number;
  errors: Array<{ place: string; error: string }>;
}

/**
 * Extract source venue ID from PlaceData (e.g., from URL or raw data)
 */
function extractSourceVenueId(place: PlaceData): string | null {
  // Try to extract from URL if available
  if (place.url && typeof place.url === "string") {
    const url = new URL(place.url, "https://example.com");
    const pathParts = url.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      // Include the query string: sources that key each venue in the query
      // (?id=N) would collide on the path segment alone ("venue_detail.php")
      // across all venues of the source.
      return pathParts[pathParts.length - 1] + url.search;
    }
  }

  // Try to extract from raw data if it's an object
  if (place.raw && typeof place.raw === "object") {
    const raw = place.raw as Record<string, unknown>;
    if (raw.id && typeof raw.id === "string") {
      return raw.id;
    }
    if (raw.slug && typeof raw.slug === "string") {
      return raw.slug;
    }
  }

  return null;
}

/**
 * Normalize phone number for matching
 */
function normalizePhone(tel: string | undefined | null): string | null {
  if (!tel) return null;
  // Remove spaces, dashes, dots, parentheses
  const cleaned = tel.replace(/[\s\-.()]/g, "").trim();
  if (!cleaned) return null;
  return cleaned.slice(0, 20);
}

/**
 * Normalize website URL for storage — returns full URL with protocol.
 * Handles inputs with or without a protocol (e.g. "example.com" → "https://example.com").
 */
function normalizeWebsite(website: string | undefined): string | null {
  if (!website) return null;
  try {
    // Prepend protocol if missing so URL parsing works
    const withProtocol = /^https?:\/\//.test(website) ? website : `https://${website}`;
    const url = new URL(withProtocol);
    // Return full URL, stripping www. from hostname but preserving path
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    const path = url.pathname.replace(/\/$/, ""); // strip trailing slash
    return path ? `${hostname}${path}` : hostname;
  } catch {
    return null;
  }
}

/**
 * Matches strings that are a bare email address (e.g. "fitness-centrum@web.de").
 * Some directories use the venue's contact email as the listing title.
 */
const EMAIL_LIKE_NAME = /^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$/;

/** Local parts that carry no venue identity — fall back to the domain base instead. */
const GENERIC_EMAIL_LOCAL_PARTS = new Set([
  "info", "kontakt", "contact", "admin", "mail", "hallo", "hello",
  "office", "buero", "service", "support", "webmaster", "post",
]);

/** Freemail providers — a generic local + freemail domain yields junk ("info@web.de" → "Web"); keep the original email instead. */
const FREEMAIL_DOMAINS = new Set([
  "web.de", "gmx.de", "gmx.net", "gmx.at", "t-online.de", "freenet.de",
  "gmail.com", "googlemail.com", "outlook.com", "outlook.de", "hotmail.com",
  "yahoo.com", "yahoo.de", "icloud.com", "mailbox.org", "posteo.de",
]);

/**
 * Derive a readable venue name from an email-shaped listing title.
 * "fitness-centrum@web.de"   → "Fitness Centrum"
 * "info@ac-1900-yoga.de"     → "Ac 1900 Yoga" (generic local part → domain base)
 * Returns the input unchanged for anything that is not a bare email,
 * or when derivation yields nothing usable (pure digits, empty).
 */
export function deriveNameFromEmail(name: string): string {
  const trimmed = name.trim();
  if (!EMAIL_LIKE_NAME.test(trimmed)) return name;

  const [localPart = "", domain = ""] = trimmed.toLowerCase().split("@");
  const generic = GENERIC_EMAIL_LOCAL_PARTS.has(localPart);
  // Generic local + freemail domain ("kontakt@gmx.de") has no identity to derive — keep the email
  if (generic && FREEMAIL_DOMAINS.has(domain)) return name;
  const source = generic ? (domain.split(".")[0] ?? localPart) : localPart;

  const words = source
    .split(/[-_.+]+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .filter(Boolean);

  // Pure-digit or empty derivations are worse than keeping the email
  const joined = words.join(" ").trim();
  if (!joined || /^\d+$/.test(source)) return name;
  return joined;
}


/**
 * Ingest scraped places into venue_sources table
 */
export async function ingestVenueSources(
  input: IngestionInput
): Promise<IngestionResult> {
  const db = useDrizzle();
  const result: IngestionResult = {
    ingested: 0,
    errors: [],
  };

  // Use source code directly from the scraping source
  const sourceCode = input.source.meta.id;
  const locale = input.source.meta.locales[0] || "fr-FR";

  // Filter out obviously non-venue businesses by name
  const NON_VENUE_KEYWORDS = [
    'nails', 'hair', 'beauty', 'salon', 'coiffure', 'ongle',
    'tattoo', 'piercing',
    'pharmacy', 'apotheken', 'restaurant', 'cafe', 'bar ',
  ];
  function isLikelyVenue(name: string): boolean {
    const lower = name.toLowerCase();
    return !NON_VENUE_KEYWORDS.some(kw => lower.includes(kw));
  }

  // Process each place
  for (const place of input.places) {
    // Skip non-venue businesses (e.g., nails salons, hair salons)
    if (place.name && !isLikelyVenue(place.name)) {
      console.log(`[ingest] Skipping non-venue business: "${place.name}"`);
      continue;
    }
    try {
      // Normalize address
      const normalizedAddress = normalizeAddressFromPlace(place);
      let addressId: number | null = null;

      if (normalizedAddress) {
        addressId = await upsertCityAndAddress(normalizedAddress);
      }

      // Extract source venue ID
      const sourceVenueId = extractSourceVenueId(place);

      // Build venue_sources payload
      const venueSourceData = {
        sourceCode,
        sourceVenueId,
        locale,
        name: place.name ? deriveNameFromEmail(place.name) : null,
        url: (() => {
          if (typeof place.url !== "string" || !place.url.trim()) return null;
          try { new URL(place.url); return place.url; } catch { return null; }
        })(),
        website: normalizeWebsite(place.website),
        tel: normalizePhone(place.tel),
        addressId,
        raw: place as unknown,
      };

      // Validate with Zod
      const validated = insertVenueSourceSchema.parse(venueSourceData);

      // Check if record already exists and upsert manually
      // (since unique constraints with nullable columns don't work well)
      let existing: typeof venueSources.$inferSelect | undefined;

      if (sourceVenueId) {
        existing = await db.query.venueSources.findFirst({
          where: { AND: [{ sourceCode: sourceCode }, { sourceVenueId: sourceVenueId }] },
        });
      } else if (validated.url) {
        existing = await db.query.venueSources.findFirst({
          where: { AND: [{ sourceCode: sourceCode }, { url: validated.url }] },
        });
      }

      if (existing) {
        // Update existing record
        await db
          .update(venueSources)
          .set({
            name: validated.name,
            url: validated.url,
            website: validated.website,
            tel: validated.tel,
            addressId: validated.addressId,
            raw: validated.raw,
            locale: validated.locale,
          })
          .where(eq(venueSources.id, existing.id));
      } else {
        // Insert new record
        await db.insert(venueSources).values(validated);
      }

      result.ingested++;
    } catch (error) {
      const err = error as Error;
      result.errors.push({
        place: place.name || "unknown",
        error: err.message,
      });
      console.error(`Error ingesting place ${place.name}:`, err);
    }
  }

  return result;
}

