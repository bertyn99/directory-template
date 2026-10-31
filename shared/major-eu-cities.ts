import { directoryConfig } from "~~/directory.config";

/**
 * Major-city DATA lives in directory.config.ts (scraping.seedCities) — this
 * module keeps only the lookup/slug/card helpers. Decision (template
 * extraction): the list moved to config as the single data surface, while the
 * file stays because its helpers have many app/server consumers plus a unit
 * test. Alias handling (e.g. Lisboa → Lisbon) is a mechanic of this helper,
 * not instantiation data, so it stays here.
 */
export const MAJOR_EU_CITIES = directoryConfig.scraping.seedCities;

export type MajorEuCityName = (typeof MAJOR_EU_CITIES)[number];

export const MAJOR_EU_CITY_ALIASES: Record<string, MajorEuCityName> = {
  Lisboa: "Lisbon",
};

/**
 * Country slug (DB `countries.slug` — slugified country name) per canonical
 * major city. Feeds the CROSS-COUNTRY city links in the
 * 'country-city-category' chain pattern (sibling-city grids link
 * /{country}/{city}/{category}, so each card needs its country). Same-country
 * lists reuse the page's own country instead — country-scoped city lists may
 * include non-major cities that are absent from this map.
 *
 * Names must cover every entry of scraping.seedCities (an instantiation
 * replacing the seed list MUST extend this map; unknown names return null and
 * callers fall back to the /categories/{category}/{city} URL, which the
 * dispatcher middleware resolves + redirects server-side).
 */
export const MAJOR_EU_CITY_COUNTRY: Record<string, string> = {
  // France
  Paris: "france",
  Marseille: "france",
  Lyon: "france",
  Toulouse: "france",
  Nice: "france",
  Nantes: "france",
  Montpellier: "france",
  Strasbourg: "france",
  Bordeaux: "france",
  Lille: "france",
  // Germany
  Berlin: "germany",
  Hamburg: "germany",
  Munich: "germany",
  Cologne: "germany",
  // United Kingdom
  London: "united-kingdom",
  Birmingham: "united-kingdom",
  Glasgow: "united-kingdom",
  // Spain / Italy
  Madrid: "spain",
  Barcelona: "spain",
  Valencia: "spain",
  Rome: "italy",
  Milan: "italy",
  Naples: "italy",
  // Netherlands / Belgium / Austria / Switzerland
  Amsterdam: "netherlands",
  Brussels: "belgium",
  Vienna: "austria",
  Zurich: "switzerland",
  // Portugal
  Lisbon: "portugal",
  Porto: "portugal",
  // Réunion (own country row — "Reunion", not a French overseas code fold)
  "Saint-Denis": "reunion",
};

/** Country slug for a canonical major-city name, alias-resolved; null when unknown. */
export function majorEuCityCountrySlug(name: string): string | null {
  const canonical = canonicalizeMajorEuCityName(name);
  if (!canonical) return MAJOR_EU_CITY_COUNTRY[name] ?? null;
  return MAJOR_EU_CITY_COUNTRY[canonical] ?? null;
}

export function majorEuCityLookupNames(): string[] {
  return [...MAJOR_EU_CITIES, ...Object.keys(MAJOR_EU_CITY_ALIASES)];
}

export function canonicalizeMajorEuCityName(
  name: string,
): MajorEuCityName | null {
  if ((MAJOR_EU_CITIES as readonly string[]).includes(name)) {
    return name as MajorEuCityName;
  }
  return MAJOR_EU_CITY_ALIASES[name] ?? null;
}

export function majorEuCityImageSlug(name: string): string {
  const canonical = canonicalizeMajorEuCityName(name) ?? name;
  return canonical.toLowerCase().replace(/\s+/g, "-");
}

export function majorEuCityImageSrc(name: string): string {
  return `/img/cities/${majorEuCityImageSlug(name)}.jpg`;
}

export function hasMajorEuCityImage(name: string): boolean {
  return canonicalizeMajorEuCityName(name) != null;
}

/** Resolve a public slug (`paris`, `paris-75001`, `lisboa`) to a major-city name. */
export function majorEuCityFromPublicSlug(slug: string): MajorEuCityName | null {
  const normalized = slug.toLowerCase();
  for (const name of MAJOR_EU_CITIES) {
    const imageSlug = majorEuCityImageSlug(name);
    if (normalized === imageSlug || normalized.startsWith(`${imageSlug}-`)) {
      return name;
    }
  }
  for (const [alias, canonical] of Object.entries(MAJOR_EU_CITY_ALIASES)) {
    const aliasSlug = alias.toLowerCase().replace(/\s+/g, "-");
    if (normalized === aliasSlug || normalized.startsWith(`${aliasSlug}-`)) {
      return canonical;
    }
  }
  return null;
}

/** Name slugs that should resolve to the same city (`lisbon` + `lisboa`). */
export function majorEuCitySlugAliases(publicSlug: string): string[] {
  const canonical = majorEuCityFromPublicSlug(publicSlug);
  if (!canonical) return [publicSlug];

  const canonicalSlug = majorEuCityImageSlug(canonical);
  const aliasSlugs = Object.entries(MAJOR_EU_CITY_ALIASES)
    .filter(([, name]) => name === canonical)
    .map(([alias]) => alias.toLowerCase().replace(/\s+/g, "-"));

  const isNameSlug =
    publicSlug === canonicalSlug || aliasSlugs.includes(publicSlug);
  if (!isNameSlug) return [publicSlug];

  return [...new Set([canonicalSlug, publicSlug, ...aliasSlugs])];
}

export function formatParisArrondissement(zip: string): number | null {
  const match = /^75(\d{3})$/.exec(zip);
  if (!match?.[1]) return null;
  const n = Number(match[1]);
  if (n < 1 || n > 20) return null;
  return n;
}

export function toMajorEuCityCards(
  rows: Array<{ name: string; venueCount: number }>,
): Array<{ name: MajorEuCityName; venueCount: number }> {
  const found = new Map<MajorEuCityName, number>();

  for (const row of rows) {
    const canonical = canonicalizeMajorEuCityName(row.name);
    if (!canonical) continue;
    found.set(canonical, (found.get(canonical) ?? 0) + row.venueCount);
  }

  return [...MAJOR_EU_CITIES]
    .map((name) => ({ name, venueCount: found.get(name) ?? 0 }))
    .sort((a, b) => b.venueCount - a.venueCount || a.name.localeCompare(b.name));
}
