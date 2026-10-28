import type { BrowserContext } from "playwright";
import type { ActivityData, CityData } from "../parser";
/**
 * Country code aligned with countries.code (ISO 3166-1 alpha-2)
 */
export type CountryCode = string; // e.g., 'FR', 'US', 'GB'

/**
 * Locale code (e.g., 'fr-FR', 'en-GB', 'en-US')
 */
export type LocaleCode = string;

/**
 * Generic place data extracted from any scraping source.
 * Provider-specific fields should extend this interface.
 */
export interface PlaceData {
  name: string;
  url?: string;
  /**
   * Address object. Expected shape: { street?: string, city: string, zip?: string, country?: string }
   */
  address?: unknown;
  tel?: string;
  website?: string;
  description?: unknown;
  socialMedia?: unknown;
  type?: unknown;
  /**
   * Per-niche scraped attributes riding along with the place (e.g. surface
   * type for padel clubs, star rating / wellness areas for spas). No engine
   * consumer in the template — the full payload is kept in venue_sources.raw
   * either way; this typing makes the shape explicit for adapters.
   */
  attributes?: Record<string, unknown>;
  /**
   * Per-niche price lines scraped from the source (e.g. "Open play 1h").
   * No engine consumer in the template — additive typing for adapters.
   */
  prices?: Array<{ label: string; amount: number; duration?: string }>;
  /** Full original payload from the provider */
  raw?: unknown;
}

/**
 * Metadata about a scraping source
 */
export interface ScrapingSourceMeta {
  id: string; // Unique identifier (e.g., 'masalledesport')
  name: string; // Human-readable name
  baseUrl: string; // Base URL of the source
  countries: CountryCode[]; // Supported countries
  locales: LocaleCode[]; // Supported locales
  /** Whether this source requires a browser (Playwright) for scraping */
  requiresBrowser?: boolean; // default: true
  /** Request timeout in ms. Default: 30000 */
  requestTimeout?: number;
  /** Max concurrent city requests for this source. Default: 2 (browser), 5 (API-only) */
  maxConcurrency?: number;
}

/**
 * Context for scraping operations
 */
export interface ScrapingContext {
  browserContext?: BrowserContext;
}

/**
 * Options for getting places
 */
export interface GetPlacesOptions {
  maxPages?: number;
}

/**
 * Adapter interface for scraping sources
 */
export interface ScrapingSourceAdapter {
  meta: ScrapingSourceMeta;
  getActivities(context: ScrapingContext): Promise<ActivityData[]>;
  getCitiesForActivity(
    context: ScrapingContext,
    activity: ActivityData
  ): Promise<CityData[]>;
  getPlacesForCity(
    context: ScrapingContext,
    city: CityData,
    options?: GetPlacesOptions
  ): Promise<PlaceData[]>;
}
export type { ActivityData, CityData } from "../parser";
