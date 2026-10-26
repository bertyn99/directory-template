import type { PlaceData } from "../scraping/parser";
import { useDrizzle } from "#imports";
import {
  cities,
  addresses,
  countries,
  insertCitySchema,
  insertAddressSchema,
} from "~~/server/db/schemas";

export interface NormalizedAddressInput {
  street1: string;
  street2?: string;
  zip?: string;
  cityName: string;
  countryCode?: string;
  /** Optional coordinates from the source (decimal strings) — stored on the address. */
  lat?: string;
  lng?: string;
}

// ─── Country-specific address parsers ────────────────────────────

/**
 * UK postcode regex: matches formats like SW1A 1AA, M1 1AA, EC1A 1BB, W1A 0AX
 * Outward code: 1-2 letters + 1-2 digits + optional letter
 * Inward code: 1 digit + 2 letters
 */
const UK_POSTCODE_REGEX = /\b([A-Z]{1,2}[0-9][0-9A-Z]?)\s*([0-9][A-Z]{2})\b/i;

/**
 * German PLZ regex: exactly 5 digits, word-boundary anchored
 */
const DE_PLZ_REGEX = /\b(\d{5})\b/;

/**
 * Parse a raw UK address string.
 * Examples:
 *   "123 High Street, London SW1A 1AA"
 *   "Manchester M1 1AA"
 *   "10 Downing St, Westminster, SW1A 2AA"
 */
export function parseUKAddress(raw: string): NormalizedAddressInput | null {
  if (!raw || typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Extract postcode
  const postcodeMatch = trimmed.match(UK_POSTCODE_REGEX);
  if (!postcodeMatch) return null;

  const outward = postcodeMatch[1] ?? "";
  const inward = postcodeMatch[2] ?? "";
  const postcode = `${outward.toUpperCase()} ${inward.toUpperCase()}`;
  const postcodeFull = postcodeMatch[0] ?? "";

  // Remove postcode from string to get the rest
  const withoutPostcode = trimmed
    .replace(postcodeFull, "")
    .replace(/,\s*$/, "")
    .replace(/^\s*,\s*/, "")
    .trim();

  // Split remaining by commas to find city and street
  const parts = withoutPostcode
    .split(/,\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Every branch below assigns cityName before it is read, so no initializer
  // is needed (oxlint no-useless-assignment).
  let cityName: string;

  if (parts.length >= 2) {
    // Last part is likely city, first part(s) are street
    cityName = parts[parts.length - 1] ?? "";
    street1 = parts.slice(0, -1).join(", ");
  } else if (parts.length === 1) {
    // Could be just "Manchester" or just "123 High Street"
    // If it looks like a street (has a number), treat the other part as city
    const part = parts[0] ?? "";
    if (/^\d/.test(part)) {
      street1 = part;
      // City is unknown — use outward postcode area as fallback
      cityName = (postcodeMatch[1] ?? "").toUpperCase();
    } else {
      cityName = part;
    }
  } else {
    // Only postcode, nothing else
    cityName = (postcodeMatch[1] ?? "").toUpperCase();
  }

  if (!cityName) return null;
  return {
    street1,
    zip: postcode,
    cityName,
    countryCode: "GB",
  };
}

/**
 * Parse a raw German address string.
 * Examples:
 *   "Musterstraße 1, 12345 Berlin"
 *   "Hauptstr. 42, 80331 München"
 *   "12345 Berlin" (PLZ + city only)
 */
export function parseDEAddress(raw: string): NormalizedAddressInput | null {
  if (!raw || typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Extract PLZ
  const plzMatch = trimmed.match(DE_PLZ_REGEX);
  if (!plzMatch) return null;

  const plz = plzMatch[1] ?? "";

  // Remove PLZ from string
  const withoutPlz = trimmed
    .replace(plzMatch[0] ?? "", "")
    .replace(/,\s*$/, "")
    .replace(/^\s*,\s*/, "")
    .trim();

  // Split remaining by commas
  const parts = withoutPlz
    .split(/,\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  let street1 = "";
  let cityName = "";

  if (parts.length >= 2) {
    // "Musterstraße 1, Berlin" → street = first, city = last
    street1 = parts[0] ?? "";
    cityName = parts[parts.length - 1] ?? "";
  } else if (parts.length === 1) {
    const part = parts[0] ?? "";
    // If starts with a number, it's likely a street
    if (/^\d/.test(part)) {
      street1 = part;
    } else {
      // Likely a city name (e.g., "Berlin" after removing PLZ)
      cityName = part;
    }
  }

  // After removing PLZ, try to split "street, city" from the full string
  // Handle case like "Musterstraße 1, 12345 Berlin" where PLZ is between street and city
  if (!cityName && !street1) {
    return null;
  }

  // Try to extract city from after the PLZ in original string
  if (!cityName) {
    const afterPlz = trimmed
      .substring(trimmed.indexOf(plzMatch[0] ?? "") + (plzMatch[0]?.length ?? 0))
      .trim();
    if (afterPlz) {
      cityName = afterPlz.replace(/^,\s*/, "").trim();
    }
  }

  if (!cityName) return null;

  return {
    street1,
    zip: plz,
    cityName,
    countryCode: "DE",
  };
}

/**
 * Normalize address from a raw string, dispatching by country code.
 */
export function normalizeAddressString(
  raw: string,
  countryCode?: string,
): NormalizedAddressInput | null {
  if (!raw || typeof raw !== "string") return null;

  const code = countryCode?.toUpperCase();

  switch (code) {
    case "GB":
    case "UK":
      return parseUKAddress(raw);
    case "DE":
      return parseDEAddress(raw);
    default:
      // Try to auto-detect format
      if (UK_POSTCODE_REGEX.test(raw)) {
        return parseUKAddress(raw);
      }
      if (DE_PLZ_REGEX.test(raw)) {
        return parseDEAddress(raw);
      }
      // Unknown format — return a best-effort parse
      return parseGenericAddress(raw, countryCode);
  }
}

/**
 * Generic fallback parser: splits by commas, tries to find a zip code.
 */
function parseGenericAddress(raw: string, countryCode?: string): NormalizedAddressInput | null {
  const parts = raw
    .split(/,\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  // Try to find a zip (5-digit number in any part)
  let zip: string | undefined;
  let cityPart = "";
  let streetParts: string[] = [];

  for (const part of parts) {
    const zipMatch = part.match(/\b(\d{4,5})\b/);
    if (zipMatch) {
      zip = zipMatch[1] ?? undefined;
      // The rest of this part after removing zip is likely city
      const remainder = part.replace(zipMatch[0] ?? "", "").trim();
      if (remainder) cityPart = remainder;
    } else {
      streetParts.push(part);
    }
  }

  // If no zip found, last part is likely city, rest is street
  if (!zip && parts.length >= 2) {
    cityPart = parts[parts.length - 1] ?? "";
    streetParts = parts.slice(0, -1);
  } else if (!zip && parts.length === 1) {
    cityPart = parts[0] ?? "";
  }

  if (!cityPart) return null;

  return {
    street1: streetParts.join(", "),
    zip,
    cityName: cityPart,
    countryCode,
  };
}

/**
 * Normalize address from PlaceData.
 * Handles both structured address objects and raw address strings.
 * Dispatches to country-specific parsers when needed.
 */
export function normalizeAddressFromPlace(place: PlaceData): NormalizedAddressInput | null {
  if (!place.address) {
    return null;
  }

  // Case 1: Raw string address
  if (typeof place.address === "string") {
    return normalizeAddressString(place.address, undefined);
  }

  // Case 2: Structured address object
  if (typeof place.address !== "object") {
    return null;
  }

  const addr = place.address as Record<string, unknown>;

  // If there's a raw/full address string and no structured city, try string parsing
  const hasStructuredCity = typeof addr.city === "string" && addr.city.trim() !== "";
  const rawAddr =
    typeof addr.full === "string" ? addr.full : typeof addr.raw === "string" ? addr.raw : undefined;

  if (!hasStructuredCity && rawAddr) {
    const countryCode = typeof addr.country === "string" ? addr.country : undefined;
    const parsed = normalizeAddressString(rawAddr, countryCode);
    if (parsed) return parsed;
  }

  // Standard structured extraction (original French format)
  const street1 = typeof addr.street === "string" ? addr.street : "";
  const street2 = typeof addr.street2 === "string" ? addr.street2 : undefined;
  const zip = typeof addr.zip === "string" ? addr.zip : undefined;
  const cityName = typeof addr.city === "string" ? addr.city : "";
  const countryCode = typeof addr.country === "string" ? addr.country : undefined;

  if (!cityName) {
    return null;
  }

  const lat =
    typeof addr.lat === "number"
      ? String(addr.lat)
      : typeof addr.lat === "string" && addr.lat.trim() !== ""
        ? addr.lat
        : undefined;
  const lng =
    typeof addr.lng === "number"
      ? String(addr.lng)
      : typeof addr.lng === "string" && addr.lng.trim() !== ""
        ? addr.lng
        : undefined;

  return {
    street1: street1 || "",
    street2,
    zip,
    cityName,
    countryCode,
    ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
  };
}

/**
 * Upsert city and address, returning the address ID
 */

/**
 * ISO 3166-1 codes of French overseas territories (DROM-COM).
 * They are regions of France, not countries — remap to FR so scrapers
 * never create ghost country rows (e.g. "GF" from Fitness Park Guyane).
 * RE is intentionally not remapped: it already has its own legacy
 * dataset and is hidden from the countries page via getCountriesWithCounts.
 */
const FRENCH_OVERSEAS_TO_FR: Record<string, string> = {
  GF: "FR", // Guyane
  GP: "FR", // Guadeloupe
  MQ: "FR", // Martinique
  YT: "FR", // Mayotte
  PM: "FR", // Saint-Pierre-et-Miquelon
  WF: "FR", // Wallis-et-Futuna
  PF: "FR", // Polynésie française
  NC: "FR", // Nouvelle-Calédonie
  BL: "FR", // Saint-Barthélemy
  MF: "FR", // Saint-Martin
  TF: "FR", // Terres australes françaises
};

function resolveCountryCode(rawCode: string): string {
  const upperCode = rawCode.toUpperCase();
  return FRENCH_OVERSEAS_TO_FR[upperCode] ?? upperCode;
}

export async function upsertCityAndAddress(input: NormalizedAddressInput): Promise<number | null> {
  const db = useDrizzle();

  try {
    // Find or create country (case-insensitive lookup by code)
    let countryId: number | null = null;
    if (input.countryCode) {
      const upperCode = resolveCountryCode(input.countryCode);
      const country = await db.query.countries.findFirst({
        where: { code: { ilike: upperCode } },
      });
      if (country) {
        countryId = country.id;
      } else {
        // Only create if it's a known country code
        // Map of ISO codes to canonical English names (for slug generation)
        const COUNTRY_NAMES: Record<string, string> = {
          FR: "France",
          DE: "Germany",
          GB: "United Kingdom",
          ES: "Spain",
          IT: "Italy",
          PT: "Portugal",
          RE: "Reunion",
          AT: "Austria",
          CH: "Switzerland",
          BE: "Belgium",
          NL: "Netherlands",
        };
        const countryName = COUNTRY_NAMES[upperCode] || upperCode;
        const [newCountry] = await db
          .insert(countries)
          .values({
            code: upperCode,
            name: countryName,
          })
          .returning({ id: countries.id });
        countryId = newCountry?.id ?? null;
      }
    }

    // Find or create city
    let cityId: number | null = null;
    const cityWhere = input.zip
      ? { AND: [{ name: { ilike: input.cityName } }, { zip: input.zip }] }
      : { name: { ilike: input.cityName } };

    // Try to find existing city first (fast path)
    const existingCity = await db.query.cities.findFirst({
      where: cityWhere,
    });

    if (existingCity) {
      cityId = existingCity.id;
    } else {
      // Use INSERT ... ON CONFLICT DO NOTHING as race condition safeguard
      // Then query again to get the ID (whether ours or the winner's)
      try {
        const cityData = insertCitySchema.parse({
          name: input.cityName,
          zip: input.zip,
          countryId,
        });
        const [newCity] = await db
          .insert(cities)
          .values(cityData)
          .onConflictDoNothing()
          .returning({ id: cities.id });
        cityId = newCity?.id ?? null;
      } catch {
        // Race condition: another worker inserted first
        // Fall through to re-query
      }

      // If insert returned nothing (conflict), re-query to get the ID
      if (!cityId) {
        const existingCity = await db.query.cities.findFirst({ where: cityWhere });
        cityId = existingCity?.id ?? null;
      }
    }

    if (!cityId) {
      return null;
    }

    // Coordinates are extracted before the lookup so the reuse check below
    // can compare them against the existing row.
    const lat = typeof input.lat === "string" && input.lat.trim() !== "" ? input.lat : undefined;
    const lng = typeof input.lng === "string" && input.lng.trim() !== "" ? input.lng : undefined;

    // Find or create address
    const addressWhere = {
      AND: [
        { cityId: cityId },
        { street1: input.street1 },
        ...(input.zip ? [{ zip: input.zip }] : []),
      ],
    };

    const existingAddress = await db.query.addresses.findFirst({
      where: addressWhere,
    });

    if (existingAddress) {
      // (cityId, street1) is not a unique location key: sources without
      // street data (e.g. Sport80 sends coordinates only) collapse every
      // place onto (pseudo-city, ""). Reuse the existing row only when the
      // new input carries no coordinates (nothing to distinguish) or when
      // the coordinates identify the SAME location — otherwise create a
      // distinct address row so each place keeps its own coordinates.
      const sameLocation =
        lat === undefined || (existingAddress.lat === lat && existingAddress.lng === lng);
      if (sameLocation) {
        return existingAddress.id;
      }
    }

    const addressData = insertAddressSchema.parse({
      street1: input.street1,
      street2: input.street2,
      zip: input.zip || "",
      cityId,
      ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
    });

    const [newAddress] = await db
      .insert(addresses)
      .values(addressData)
      .returning({ id: addresses.id });

    return newAddress?.id ?? null;
  } catch (error) {
    console.error("Error upserting city and address:", error);
    return null;
  }
}
