/**
 * Static ids of the scraping source adapters registered in `registry.ts`.
 *
 * registry.ts imports Playwright transitively (adapter parsers →
 * ../browser.ts), so the unit instantiation-contract test
 * (test/unit/instantiation-contract.test.ts, pure-Node lane) cannot import
 * it. This dependency-free list is what the contract test validates
 * `directoryConfig.scraping.sources` against; registry.ts asserts at boot
 * that this list still mirrors its registered adapters, so the chain
 * config → ids.ts → adapters cannot drift silently.
 *
 * Add a new adapter here AND register it in registry.ts.
 */
export const SCRAPING_SOURCE_IDS = [
  "masalledesport",
  "fitnesspark",
  "osm-overpass",
] as const;

export type ScrapingSourceId = (typeof SCRAPING_SOURCE_IDS)[number];
