import type { ScrapingSourceAdapter, CountryCode, LocaleCode } from "./types";
import { masalledesportSource } from "./masalledesport";
import { fitnessparkSource } from "./fitnesspark";
import { osmOverpassSource } from "./osm-overpass";
import { directoryConfig } from "~~/directory.config";
import { SCRAPING_SOURCE_IDS } from "./ids";

/**
 * Registry of all available scraping sources.
 *
 * The template ships REFERENCE adapters: two multi-sport venue aggregators
 * (masalledesport — Playwright HTML crawl; fitnesspark — server-rendered
 * HTML) and one JSON no-browser archetype (osm-overpass — plain HTTP JSON
 * API for govt datasets/OSM/Maps sources). Each instantiation replaces them
 * with adapters for its own data sources.
 *
 * Adapters are CODE (Playwright parsers — logic, not config). What IS config
 * is which of them are active: `directoryConfig.scraping.sources` selects
 * the subset `getAllSources()` returns. Unknown ids fail fast at boot, and
 * ids.ts (the Playwright-free copy of the adapter ids the unit contract test
 * reads) is drift-checked against the adapters below.
 */
const allAdapters: ScrapingSourceAdapter[] = [
  masalledesportSource,
  fitnessparkSource,
  osmOverpassSource,
];

// Drift guard: ids.ts must mirror exactly the adapters registered here.
if (
  SCRAPING_SOURCE_IDS.length !== allAdapters.length
  || !SCRAPING_SOURCE_IDS.every((id) => allAdapters.some((a) => a.meta.id === id))
) {
  throw new Error(
    `Scraping source drift: sources/ids.ts (${SCRAPING_SOURCE_IDS.join(", ")}) `
    + `does not match the adapters registered in registry.ts (${allAdapters.map((a) => a.meta.id).join(", ")}). Update both together.`,
  );
}

// Fail fast when the config activates an adapter that does not exist.
const unknownSources = directoryConfig.scraping.sources.filter(
  (id) => !allAdapters.some((a) => a.meta.id === id),
);
if (unknownSources.length) {
  throw new Error(
    `directory.config scraping.sources lists unknown adapters: ${unknownSources.join(", ")}`,
  );
}

/**
 * Type representing the union of all valid source codes
 * Used for type-safe source references in the database
 */
export type SourceCode = (typeof allAdapters)[number]["meta"]["id"];

/**
 * Get the ACTIVE sources — the registered adapters selected by
 * directoryConfig.scraping.sources (config order is not preserved; the
 * registry order is stable).
 */
export function getAllSources(): ScrapingSourceAdapter[] {
  return allAdapters.filter((a) =>
    (directoryConfig.scraping.sources as readonly string[]).includes(a.meta.id),
  );
}

/**
 * Get a source by its ID (among all REGISTERED adapters, active or not —
 * explicit per-id scrape requests resolve here)
 */
export function getSourceById(id: string): ScrapingSourceAdapter | undefined {
  return allAdapters.find((source) => source.meta.id === id);
}

/**
 * Get sources filtered by country and optionally locale
 */
export function getSourcesByCountryAndLocale(
  country: CountryCode,
  locale?: LocaleCode,
): ScrapingSourceAdapter[] {
  return allAdapters.filter((source) => {
    const countryMatch = source.meta.countries.includes(country);
    if (!countryMatch) return false;
    if (locale) {
      return source.meta.locales.includes(locale);
    }
    return true;
  });
}
