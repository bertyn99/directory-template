/**
 * JSON no-browser reference adapter — copy this for govt datasets / OSM / Maps
 * sources. `requiresBrowser: false` so the scrape job never launches Playwright
 * for this source. The 3-stage adapter contract is filled with a pseudo-activity
 * (first taxonomy category) and seedCities as the city list; getPlacesForCity
 * issues one Overpass QL POST per city.
 *
 * Not selected by default (`directoryConfig.scraping.sources`). Enable by adding
 * `"osm-overpass"` to that list after reviewing Overpass usage policy.
 */
import type {
  ScrapingSourceAdapter,
  ScrapingSourceMeta,
  ScrapingContext,
  GetPlacesOptions,
  PlaceData,
} from "./types";
import type { ActivityData, CityData } from "../parser";
import { directoryConfig } from "~~/directory.config";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const meta: ScrapingSourceMeta = {
  id: "osm-overpass",
  name: "OpenStreetMap Overpass",
  baseUrl: "https://www.openstreetmap.org",
  countries: ["FR", "DE", "ES", "IT", "PT", "GB", "BE", "NL", "AT", "CH"],
  locales: ["en"],
  requiresBrowser: false,
  requestTimeout: 30000,
  maxConcurrency: 1,
};

/** Minimal Overpass element shape used by the mapper (node / way / relation). */
export interface OverpassElement {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}

function unescapeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function latLngOf(element: OverpassElement): { lat?: number; lng?: number } {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return { lat: element.lat, lng: element.lon };
  }
  if (typeof element.center?.lat === "number" && typeof element.center?.lon === "number") {
    return { lat: element.center.lat, lng: element.center.lon };
  }
  return {};
}

function streetOf(tags: Record<string, string>): string | undefined {
  const street = tags["addr:street"];
  const number = tags["addr:housenumber"];
  if (street && number) return `${number} ${street}`;
  return street;
}

/**
 * Pure Overpass element → PlaceData mapping. Exported so unit tests can cover
 * it without hitting the network.
 */
export function mapOverpassElement(element: OverpassElement): PlaceData | null {
  const tags = element.tags ?? {};
  const name = tags.name ? unescapeHtml(tags.name) : "";
  if (!name) return null;

  const { lat, lng } = latLngOf(element);
  const city = tags["addr:city"];
  const address = city
    ? {
        street: streetOf(tags),
        city,
        zip: tags["addr:postcode"],
        country: tags["addr:country"],
        lat,
        lng,
      }
    : lat != null && lng != null
      ? { city: "", lat, lng }
      : undefined;

  const attributes: Record<string, unknown> = {};
  if (tags.brand) attributes.brand = tags.brand;
  if (tags.wheelchair) attributes.wheelchair = tags.wheelchair === "yes";

  return {
    name,
    url: tags.website || tags["contact:website"] || (element.id
      ? `https://www.openstreetmap.org/${element.type ?? "node"}/${element.id}`
      : undefined),
    website: tags.website || tags["contact:website"],
    tel: tags.phone || tags["contact:phone"],
    address,
    attributes: Object.keys(attributes).length ? attributes : undefined,
    raw: element,
  };
}

function overpassQuery(city: string): string {
  const escaped = city.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  // `geocodeArea` is Overpass-turbo only — public overpass-api.de uses area filters.
  return `[out:json][timeout:25];
area["name"="${escaped}"]->.a;
nwr(area.a)["leisure"="fitness_centre"]["name"];
out center 200;`;
}

export const osmOverpassSource: ScrapingSourceAdapter = {
  meta,
  async getActivities(_context: ScrapingContext): Promise<ActivityData[]> {
    const category = directoryConfig.taxonomy.categories[0];
    return [{
      name: category?.name ?? "venues",
      url: `${meta.baseUrl}/`,
    }];
  },
  async getCitiesForActivity(
    _context: ScrapingContext,
    _activity: ActivityData,
  ): Promise<CityData[]> {
    return directoryConfig.scraping.seedCities.map((name) => ({
      id: name.toLowerCase().replace(/\s+/g, "-"),
      city: name,
      url: `${meta.baseUrl}/`,
    }));
  },
  async getPlacesForCity(
    _context: ScrapingContext,
    city: CityData,
    _options?: GetPlacesOptions,
  ): Promise<PlaceData[]> {
    try {
      const response = await fetch(OVERPASS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(overpassQuery(city.city))}`,
        signal: AbortSignal.timeout(meta.requestTimeout ?? 30000),
      });
      if (!response.ok) return [];
      const payload = await response.json() as { elements?: OverpassElement[] };
      return (payload.elements ?? [])
        .map(mapOverpassElement)
        .filter((place): place is PlaceData => place != null);
    } catch (error) {
      console.warn(`[osm-overpass] ${city.city}:`, error);
      return [];
    }
  },
};
