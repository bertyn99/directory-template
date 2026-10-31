/**
 * OpenStreetMap Overpass scraping source adapter.
 *
 * JSON no-browser archetype — copy this for govt datasets/OSM/Maps sources.
 * Unlike masalledesport (Playwright HTML crawl), this adapter is plain HTTP:
 * ONE Overpass QL query per city, POSTed with `$fetch` and mapped to
 * PlaceData. `meta.requiresBrowser: false` makes scrape-venues.ts skip the
 * Playwright launch entirely when only JSON sources are selected, while the
 * job's per-source rate limiter (createRateLimiter + executeWithRetry —
 * per-domain throttling, exponential backoff, Retry-After support) still
 * wraps every getPlacesForCity call, so this adapter inherits throttling and
 * retry for free. Overpass 429/504 and HTML error pages surface as $fetch
 * errors — the job catches per-city and marks the city failed, so it is
 * retried on the next run. Empty result sets are normal for small towns.
 *
 * Template mechanics demonstrated here:
 * - getActivities/getCitiesForActivity derive from directoryConfig (taxonomy
 *   categories[0] as the pseudo-activity, scraping.seedCities as the city
 *   list) — a JSON API needs no catalog crawl.
 * - getPlacesForCity uses Overpass's NATIVE geocoding
 *   (area(geocodeArea:"<city>")) — no separate geocoding step needed.
 * - The Overpass element → PlaceData mapping (`mapOverpassElement`) and the
 *   query builder (`buildOverpassQuery`) are exported PURE so unit tests
 *   cover them without network (test/unit/osm-overpass.test.ts).
 *
 * Venue identity: PlaceData.url is the canonical osm.org object URL, whose
 * last path segment (= the numeric OSM id) becomes venue_sources.sourceVenueId
 * at ingest (extractSourceVenueId) — same mechanism as fitnesspark's slug.
 *
 * DB registry note: the `sources` table row is migration-owned
 * (20260511083452_seed_sources_and_countries) but venue_sources.sourceCode is
 * a plain varchar with NO foreign key to sources.code — an unselected
 * reference source needs no row. Add one via a per-instantiation migration
 * only if you query `sources` for display.
 */
import type {
  ScrapingSourceAdapter,
  ScrapingSourceMeta,
  ScrapingContext,
  GetPlacesOptions,
} from "./types";
import type { ActivityData, CityData, PlaceData } from "../parser";
import { directoryConfig } from "~~/directory.config";

/** Human-browsable base URL (venue urls + search links live under it). */
const OSM_OBJECT_BASE_URL = "https://www.openstreetmap.org";
/** Overpass QL interpreter endpoint (public instance). */
const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
/**
 * OSM tag filter of the query. SAMPLE — per-niche replace (e.g.
 * "amenity=spa" for a spa directory, "leisure=padel" isn't a real tag —
 * browse taginfo.openstreetmap.org for the niche's primary tag).
 */
const OSM_TAG = "leisure=fitness_centre";
/** Server-side Overpass timeout in the QL prologue ([timeout:25]); keep < requestTimeout. */
const OVERPASS_QL_TIMEOUT = 25;
/** Max elements per query — matches the job's default dry-run cap (200). */
const OVERPASS_LIMIT = 200;

const meta: ScrapingSourceMeta = {
  id: "osm-overpass",
  name: "OpenStreetMap Overpass",
  baseUrl: OSM_OBJECT_BASE_URL,
  // Pan-European coverage — mirrors the countries of the shipped seed cities
  // (directoryConfig.scraping.seedCities banner set).
  countries: ["FR", "DE", "GB", "ES", "IT", "PT", "NL", "BE", "AT", "CH"],
  locales: ["fr-FR"],
  requiresBrowser: false,
  requestTimeout: 30000,
  // Public shared API — stay well under the defaults meant for owned targets.
  maxConcurrency: 2,
};

/** One Overpass JSON element (node/way/relation, tags + position). */
export interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  /** Ways/relations carry their representative point under `center`. */
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

/** Overpass QL string escaping (the only metacharacters inside quoted strings). */
function escapeOverpassString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * ONE Overpass QL query per city: resolve the city name to an area with
 * Overpass's native geocoding, then take named venues carrying the niche tag.
 */
export function buildOverpassQuery(city: string): string {
  return (
    `[out:json][timeout:${OVERPASS_QL_TIMEOUT}];`
    + `area(geocodeArea:"${escapeOverpassString(city)}")->.a;`
    + `nwr(area.a)[${OSM_TAG}][name];`
    + `out center ${OVERPASS_LIMIT};`
  );
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Decode HTML entities in scraped text. Overpass JSON returns raw UTF-8 but
 * OSM tags legitimately contain escaped strings (e.g. "Café &amp; Sport").
 * Unknown entities are left untouched.
 */
export function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, code: string) => {
    let parsed: number;
    if (code.startsWith("#x") || code.startsWith("#X")) {
      parsed = Number.parseInt(code.slice(2), 16);
    } else if (code.startsWith("#")) {
      parsed = Number.parseInt(code.slice(1), 10);
    } else {
      return NAMED_ENTITIES[code.toLowerCase()] ?? match;
    }
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 0x10ffff) return match;
    try {
      return String.fromCodePoint(parsed);
    } catch {
      return match;
    }
  });
}

/**
 * Map one Overpass element to PlaceData.
 * Returns null for nameless elements (the query already filters [name], but
 * defensive: empty/whitespace names are junk). Address falls back to the
 * queried city when the element carries no addr:city, so the ingest
 * normalize step (normalizeAddressFromPlace requires a city) always has one.
 * lat/lng ride the address object (normalizeAddressFromPlace consumes them).
 */
export function mapOverpassElement(
  element: OverpassElement,
  city: CityData,
): PlaceData | null {
  const tags = element.tags ?? {};
  const name = decodeHtmlEntities((tags.name ?? "").trim());
  if (!name) return null;

  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;

  const street =
    [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ").trim()
    || undefined;

  const attributes: Record<string, unknown> = {};
  if (tags.brand) attributes.brand = decodeHtmlEntities(tags.brand);
  if (tags.operator) attributes.operator = decodeHtmlEntities(tags.operator);
  if (tags.wheelchair) attributes.wheelchair = tags.wheelchair === "yes";

  return {
    name,
    // osm.org canonical URL — the trailing id segment becomes sourceVenueId.
    url: `${OSM_OBJECT_BASE_URL}/${element.type}/${element.id}`,
    address: {
      ...(street && { street }),
      city: tags["addr:city"]
        ? decodeHtmlEntities(tags["addr:city"])
        : city.city,
      ...(tags["addr:postcode"] && { zip: tags["addr:postcode"] }),
      ...(tags["addr:country"] && { country: tags["addr:country"] }),
      ...(typeof lat === "number" && typeof lng === "number" && { lat, lng }),
    },
    ...(tags.website || tags["contact:website"]
      ? { website: tags.website || tags["contact:website"] }
      : {}),
    ...(tags.phone || tags["contact:phone"]
      ? { tel: tags.phone || tags["contact:phone"] }
      : {}),
    ...(Object.keys(attributes).length > 0 && { attributes }),
    type: { source: meta.id, osmType: element.type },
    // Full original payload — kept in venue_sources.raw either way.
    raw: element,
  };
}

/**
 * OpenStreetMap Overpass scraping source adapter (JSON, no browser).
 */
export const osmOverpassSource: ScrapingSourceAdapter = {
  meta,
  async getActivities(_context: ScrapingContext): Promise<ActivityData[]> {
    // Single-tag source — the config taxonomy's first category is the
    // pseudo-activity (config-derived, never hardcoded).
    const category = directoryConfig.taxonomy.categories[0];
    if (!category) return [];
    return [
      {
        name: category.name,
        url: `${OSM_OBJECT_BASE_URL}/search?query=${encodeURIComponent(category.name)}`,
      },
    ];
  },

  async getCitiesForActivity(
    _context: ScrapingContext,
    _activity: ActivityData,
  ): Promise<CityData[]> {
    // The config seed cities ARE the crawl scope; ids are slugified names
    // (unique keys for the job's processedCityIds + Redis scrape state).
    return directoryConfig.scraping.seedCities.map((city) => ({
      id: city.toLowerCase().replace(/\s+/g, "-"),
      city,
      url: `${OSM_OBJECT_BASE_URL}/search?query=${encodeURIComponent(city)}`,
    }));
  },

  async getPlacesForCity(
    _context: ScrapingContext,
    city: CityData,
    _options?: GetPlacesOptions,
  ): Promise<PlaceData[]> {
    const timeout = meta.requestTimeout ?? 30000;
    const query = buildOverpassQuery(city.city);

    const response = await $fetch<OverpassResponse>(OVERPASS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: query }).toString(),
      timeout,
    });

    const elements = Array.isArray(response.elements) ? response.elements : [];
    const places = elements
      .map((element) => mapOverpassElement(element, city))
      .filter((place): place is PlaceData => place !== null);

    console.log(`[osm-overpass] ${city.city}: ${places.length} named places`);
    return places;
  },
};
