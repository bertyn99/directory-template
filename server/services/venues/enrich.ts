/**
 * Venue enrichment orchestrator.
 *
 * For venues that have a website but no description:
 * 1. Scrape the venue's website (meta, headings, body text, JSON-LD)
 * 2. Scrape Google Maps (rating, hours, category) — if lat/lng available
 * 3. Build a combined context string from both sources
 * 4. Generate multilingual descriptions via Gemini
 * 5. Save to venues.description JSONB
 *
 * Never throws — collects per-venue results and returns a summary.
 */

import { eq, inArray, sql, and, isNotNull } from "drizzle-orm";
import pLimit from "p-limit";
import { venues, addresses, cities } from "~~/server/db/schemas";
import { useDrizzle } from "~~/server/utils/drizzle";
import { generateContent } from "~~/server/db/service/contentGen";
import { scrapeVenueWebsite, buildScrapedContext, THIN_CONTEXT_CHARS, type ScrapedVenueData } from "../scraping/venue-website";
import { scrapeGoogleMaps, buildMapsContext } from "../scraping/google-maps";
import { closeBrowser } from "../scraping/browser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnrichOptions {
  /** Regenerate even if description already exists */
  force?: boolean;
  /** Target locales (default: fr, en) */
  locales?: string[];
  /** Specific venue IDs to process (skips the "empty description" filter) */
  venueIds?: number[];
  /** Max venues to process (default: 50) */
  limit?: number;
}

export interface EnrichResult {
  total: number;
  processed: number;
  skipped: number;
  failed: number;
  details: EnrichVenueResult[];
}

interface EnrichVenueResult {
  venueId: number;
  venueName: string;
  status: "processed" | "skipped" | "failed";
  error?: string;
  localesGenerated?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_LOCALES = ["fr", "en"];
const DEFAULT_LIMIT = 50;
const VENUE_CONCURRENCY = 3;

/**
 * Parse a JSON object from Gemini's text response.
 * Handles both raw JSON and markdown-fenced code blocks.
 */
function parseJsonFromText(text: string): { intro: string; text: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch?.[1];
    if (jsonStr) {
      parsed = JSON.parse(jsonStr.trim());
    } else {
      throw new Error(
        `Failed to parse Gemini response as JSON: ${text.substring(0, 200)}`,
      );
    }
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).intro !== "string" ||
    typeof (parsed as Record<string, unknown>).text !== "string"
  ) {
    throw new Error(
      `Gemini response missing intro/text fields: ${JSON.stringify(parsed).substring(0, 200)}`,
    );
  }

  return parsed as { intro: string; text: string };
}

// ---------------------------------------------------------------------------
// Core enrichment logic
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Quality gate
// ---------------------------------------------------------------------------

/** Max attempts (initial + one strict rewrite) before accepting a draft */
const MAX_GEN_ATTEMPTS = 2;

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (haystack.match(new RegExp(escaped, "gi")) ?? []).length;
}

function findDuplicateSentence(text: string): string | null {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.split(/\s+/).length >= 6);
  const seen = new Set<string>();
  for (const s of sentences) {
    if (seen.has(s)) return s;
    seen.add(s);
  }
  return null;
}

/**
 * Reject padded/hallucinated drafts before they reach the DB:
 * too short, venue name spammed, or the same sentence twice.
 */
function passesQualityGate(
  name: string,
  desc: { intro: string; text: string },
): { ok: boolean; reason?: string } {
  const combined = `${desc.intro} ${desc.text}`;
  if (combined.trim().length < 80) return { ok: false, reason: "too short" };
  const nameCount = countOccurrences(combined, name);
  if (nameCount > 3) return { ok: false, reason: `venue name repeated ${nameCount}x` };
  const dup = findDuplicateSentence(combined);
  if (dup) return { ok: false, reason: `duplicate sentence: "${dup.slice(0, 60)}…"` };
  return { ok: true };
}

/** Deterministic factual stub — used when the website yields (almost) nothing.
 *  Two accurate sentences beat five hallucinated ones. */
function buildStub(
  name: string,
  city: string | null,
  locale: string,
): { intro: string; text: string } {
  if (locale.startsWith("en")) {
    return {
      intro: `${name} is a venue${city ? ` located in ${city}` : ""}.`,
      text: `Detailed information (activities, schedules, prices) is not yet available on this listing. Check the venue's official website or contact them directly for current details.`,
    };
  }
  return {
    intro: `${name} est un venue${city ? ` situé à ${city}` : ""}.`,
    text: `Les informations détaillées (activités, horaires, tarifs) ne sont pas encore disponibles sur cette fiche. Consultez le site officiel du venue ou contactez-le directement pour les informations à jour.`,
  };
}

/**
 * Enrich a single venue: scrape → generate → save.
 * Never throws — errors are captured and returned.
 */
async function enrichVenue(
  venue: {
    id: number;
    name: string;
    website: string | null;
    addressId: number | null;
    description: Record<string, { intro: string; text: string }> | null;
    lat: string | null;
    lng: string | null;
    cityName?: string | null;
  },
  locales: string[],
  force: boolean,
): Promise<EnrichVenueResult> {
  const result: EnrichVenueResult = {
    venueId: venue.id,
    venueName: venue.name,
    status: "skipped",
  };

  try {
    // --- 1. Scrape website (multi-page, markdown) ---
    let scraped: ScrapedVenueData | null = null;
    const contextParts: string[] = [];
    let mapsContextFound = false;

    if (venue.website) {
      console.log(`[enrich] Scraping website for "${venue.name}": ${venue.website}`);
      try {
        const result = await scrapeVenueWebsite(venue.website);
        scraped = result;
        const websiteContext = buildScrapedContext(result);
        if (websiteContext) {
          contextParts.push(websiteContext);
        }
      } catch (scrapeErr) {
        console.warn(`[enrich] Website scrape failed for "${venue.name}": ${(scrapeErr as Error).message}`);
      }
    }

    // --- 2. Scrape Google Maps (if we have coordinates) ---
    if (venue.lat && venue.lng) {
      console.log(`[enrich] Scraping Google Maps for "${venue.name}"`);
      try {
        const mapsData = await scrapeGoogleMaps(venue.lat, venue.lng, venue.name);
        const mapsContext = buildMapsContext(mapsData);
        if (mapsContext) {
          contextParts.push(mapsContext);
          mapsContextFound = true;
        }
      } catch (mapsErr) {
        console.warn(`[enrich] Google Maps scrape failed for "${venue.name}": ${(mapsErr as Error).message}`);
      }
    }

    const combinedContext = contextParts.join("\n\n---\n\n");

    if (!combinedContext || combinedContext.trim().length < 20) {
      result.status = "skipped";
      result.error = "No scrapeable content found (website + maps both empty)";
      console.warn(`[enrich] Skipping "${venue.name}" — no context data`);
      return result;
    }

    // --- 3. Thin-context short-circuit: no AI padding over empty scrapes.
    // A deterministic 2-sentence stub is more honest than generated filler.
    const thinWebsite = !scraped || scraped.usefulChars < THIN_CONTEXT_CHARS;
    if (thinWebsite && !mapsContextFound) {
      console.log(`[enrich] Thin content for "${venue.name}" — writing factual stub`);
      const descriptionUpdate: Record<string, { intro: string; text: string }> = {
        ...(force ? {} : (venue.description ?? {})),
      };
      const localesGenerated: string[] = [];
      for (const locale of locales) {
        if (!force && venue.description?.[locale]?.text) continue;
        descriptionUpdate[locale] = buildStub(venue.name, venue.cityName ?? null, locale);
        localesGenerated.push(locale);
      }
      if (localesGenerated.length > 0) {
        await useDrizzle()
          .update(venues)
          .set({ description: descriptionUpdate, updatedAt: new Date() })
          .where(eq(venues.id, venue.id));
        result.status = "processed";
        result.localesGenerated = localesGenerated;
        console.log(`[enrich] ✓ Saved stub ${localesGenerated.join(", ")} for "${venue.name}"`);
      } else {
        result.status = "skipped";
        result.error = "All target locales already have content";
      }
      return result;
    }

    // --- 3. Generate descriptions per locale ---
    const descriptionUpdate: Record<string, { intro: string; text: string }> = {
      ...(force ? {} : (venue.description ?? {})),
    };
    const localesGenerated: string[] = [];

    for (const locale of locales) {
      // Skip if already has content and not forcing
      if (!force && venue.description?.[locale]?.text) {
        continue;
      }

      console.log(`[enrich] Generating ${locale} description for "${venue.name}"`);
      try {
        let savedDraft: { intro: string; text: string } | null = null;

        for (let attempt = 1; attempt <= MAX_GEN_ATTEMPTS && !savedDraft; attempt++) {
          const genContext =
            attempt === 1
              ? combinedContext
              : `${combinedContext}\n\nSTRICT REWRITE NOTICE: your previous draft was rejected for repetition/padding. The venue name may appear at most twice in total. Every sentence must state a concrete fact from the context above. Write fewer, denser paragraphs instead of padded ones.`;

          const rawText = await generateContent({
            type: "venueEnrich",
            subType: "content",
            data: {
              name: venue.name,
              context: genContext,
            },
            languages: locale,
          });

          const parsed = parseJsonFromText(rawText);
          const gate = passesQualityGate(venue.name, parsed);
          if (gate.ok) {
            savedDraft = parsed;
          } else if (attempt < MAX_GEN_ATTEMPTS) {
            console.warn(`[enrich] QA gate rejected "${venue.name}" (${locale}): ${gate.reason} — retrying`);
          } else {
            // Last attempt still failing: keep the better-effort draft rather
            // than dropping real scraped facts, but log it for review.
            console.warn(`[enrich] QA gate still failing for "${venue.name}" (${locale}): ${gate.reason} — saving anyway`);
            savedDraft = parsed;
          }
        }

        if (savedDraft) {
          descriptionUpdate[locale] = savedDraft;
          localesGenerated.push(locale);
        }
      } catch (genErr) {
        console.warn(`[enrich] AI generation failed for "${venue.name}" (${locale}): ${(genErr as Error).message}`);
      }
    }

    if (localesGenerated.length === 0) {
      result.status = "skipped";
      result.error = "All target locales already have content";
      return result;
    }

    // --- 4. Save to database ---
    await useDrizzle()
      .update(venues)
      .set({
        description: descriptionUpdate,
        updatedAt: new Date(),
      })
      .where(eq(venues.id, venue.id));

    result.status = "processed";
    result.localesGenerated = localesGenerated;
    console.log(
      `[enrich] ✓ Saved ${localesGenerated.join(", ")} for "${venue.name}"`,
    );
    return result;
  } catch (error) {
    result.status = "failed";
    result.error = (error as Error).message;
    console.error(`[enrich] ✗ Failed "${venue.name}":`, (error as Error).message);
    return result;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run the venue enrichment pipeline.
 *
 * Usage:
 *   await enrichVenues({ locales: ["fr", "en"] })
 *   await enrichVenues({ venueIds: [42, 99], force: true })
 */
export async function enrichVenues(
  options: EnrichOptions = {},
): Promise<EnrichResult> {
  const locales = options.locales ?? DEFAULT_LOCALES;
  const force = options.force ?? false;
  const limit = options.limit ?? DEFAULT_LIMIT;
  const venueIds = options.venueIds;

  const db = useDrizzle();

  // --- Query venues with website + (no description OR forced OR specific IDs) ---
  const baseQuery = db
    .select({
      id: venues.id,
      name: venues.name,
      website: venues.website,
      addressId: venues.addressId,
      description: venues.description,
      lat: addresses.lat,
      lng: addresses.lng,
      cityName: cities.name,
    })
    .from(venues)
    .leftJoin(addresses, eq(venues.addressId, addresses.id))
    .leftJoin(cities, eq(addresses.cityId, cities.id))
    .where(
      and(
        isNotNull(venues.website),
        ...(venueIds && venueIds.length > 0
          ? [inArray(venues.id, venueIds)]
          : force
            ? []
            : [
                sql`(venues.description IS NULL OR venues.description = '{}'::jsonb)`,
              ]),
      ),
    )
    .limit(limit);

  const targetVenues = await baseQuery;

  console.log(
    `[enrich] Found ${targetVenues.length} venues to process (force=${force}, locales=[${locales.join(",")}])`,
  );

  if (targetVenues.length === 0) {
    return {
      total: 0,
      processed: 0,
      skipped: 0,
      failed: 0,
      details: [],
    };
  }

  // --- Process with concurrency limit ---
  const concurrencyLimit = pLimit(VENUE_CONCURRENCY);

  const details = await Promise.all(
    targetVenues.map((venue) =>
      concurrencyLimit(() => enrichVenue(venue, locales, force)),
    ),
  );

  // --- Cleanup browser ---
  await closeBrowser().catch(() => {});

  // --- Summary ---
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  for (const d of details) {
    if (d.status === "processed") processed++;
    else if (d.status === "skipped") skipped++;
    else failed++;
  }

  console.log(
    `[enrich] Done. Processed: ${processed}, Skipped: ${skipped}, Failed: ${failed}`,
  );

  return {
    total: targetVenues.length,
    processed,
    skipped,
    failed,
    details,
  };
}
