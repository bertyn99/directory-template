import type { ScrapingSourceAdapter, CountryCode, LocaleCode } from "./types";
import { masalledesportSource } from "./masalledesport";
import { fitnessparkSource } from "./fitnesspark";

/**
 * Registry of all available scraping sources.
 *
 * The template ships two REFERENCE adapters (multi-sport venue aggregators).
 * Each instantiation replaces them with adapters for its own data sources.
 */
const sources: ScrapingSourceAdapter[] = [
  masalledesportSource,
  fitnessparkSource,
];

/**
 * Type representing the union of all valid source codes
 * Used for type-safe source references in the database
 */
export type SourceCode = (typeof sources)[number]["meta"]["id"];

/**
 * Get all available sources
 */
export function getAllSources(): ScrapingSourceAdapter[] {
  return [...sources];
}

/**
 * Get a source by its ID
 */
export function getSourceById(id: string): ScrapingSourceAdapter | undefined {
  return sources.find((source) => source.meta.id === id);
}

/**
 * Get sources filtered by country and optionally locale
 */
export function getSourcesByCountryAndLocale(
  country: CountryCode,
  locale?: LocaleCode,
): ScrapingSourceAdapter[] {
  return sources.filter((source) => {
    const countryMatch = source.meta.countries.includes(country);
    if (!countryMatch) return false;
    if (locale) {
      return source.meta.locales.includes(locale);
    }
    return true;
  });
}
