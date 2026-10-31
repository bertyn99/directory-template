import type { CityUrlPattern } from "~~/directory.config";
import { directoryConfig } from "~~/directory.config";
import { getActivityLocaleSlug } from "~~/shared/activities";
import { hreflangOf } from "~~/shared/locale-meta";

/**
 * Single source for the city-chain URLs (city hub + category × city) and the
 * pattern logic that flips with `directoryConfig.content.cityUrlPattern`.
 *
 * Two supported shapes (see CityUrlPattern in directory.config.ts):
 * - 'country-city-category' → hub `/{country}/{city}` + category×city
 *   `/{country}/{city}/{category}` (e.g. /france/paris/spa — chained silo).
 * - 'category-city'         → hub `/country/{country}/{city}` +
 *   category×city `/categories/{category}/{city}` (the pre-existing shape).
 *
 * Client+server importable (only reads directoryConfig — same rule as
 * shared/silo.ts). Path builders return LOCALE-UNPREFIXED paths: the leading
 * locale segment (/en/…) is added by localePath()/i18n at call sites, never
 * here. Category locale-slug resolution also stays at call sites
 * (getActivityLocaleSlug) — the category path helpers take the
 * already-resolved slug.
 */
export type { CityUrlPattern };

/** The instantiation's active chain shape. */
export const CITY_URL_PATTERN: CityUrlPattern =
  directoryConfig.content.cityUrlPattern;

/**
 * Canonical city-hub URL for the ACTIVE pattern (no locale prefix).
 * `pattern` override exists for tests and the redirect middleware, which must
 * be able to name the OTHER shape explicitly.
 */
export function cityHubPath(
  countrySlug: string,
  citySlug: string,
  pattern: CityUrlPattern = CITY_URL_PATTERN,
): string {
  return pattern === "country-city-category"
    ? `/${countrySlug}/${citySlug}`
    : `/country/${countrySlug}/${citySlug}`;
}

/**
 * The OTHER pattern's city-hub URL — the 301 target when a city hub is
 * reached through the wrong (legacy) shape. Same override rule as
 * cityHubPath.
 */
export function legacyCityHubPath(
  countrySlug: string,
  citySlug: string,
  pattern: CityUrlPattern = CITY_URL_PATTERN,
): string {
  return cityHubPath(countrySlug, citySlug, pattern === "country-city-category" ? "category-city" : "country-city-category");
}

/**
 * Category × city URL for an EXPLICIT pattern (no locale prefix). The
 * `categorySlug` argument must already be the locale-resolved URL slug —
 * resolve it at the call site with getActivityLocaleSlug(def.slug, locale) —
 * so this stays pure string-shape logic (unit-testable for both patterns).
 */
export function categoryCityPath(
  pattern: CityUrlPattern,
  categorySlug: string,
  countrySlug: string,
  citySlug: string,
): string {
  return pattern === "category-city"
    ? `/categories/${categorySlug}/${citySlug}`
    : `/${countrySlug}/${citySlug}/${categorySlug}`;
}

/**
 * Split a request path into its optional locale prefix and the remaining
 * segments. Under `prefix_except_default` only ACTIVE non-default locales
 * appear as a leading segment; a first segment equal to the default locale
 * (or any unknown value) is NOT a prefix — it is a URL segment (country
 * slugs like `france` never collide with the 2-letter locale codes).
 */
export function splitLocalePrefix(path: string): {
  prefix: string;
  segments: string[];
} {
  const segments = path.split("/").filter(Boolean);
  const first = segments[0];
  if (
    first &&
    first !== directoryConfig.defaultLocale &&
    (directoryConfig.locales as readonly string[]).includes(first)
  ) {
    return { prefix: `/${first}`, segments: segments.slice(1) };
  }
  return { prefix: "", segments };
}

/**
 * Route-params normalizer for surfaces shared by two route shapes: the
 * /categories dispatcher names its params `category`/`cities`, the
 * country-first chain route names them `category`/`city` (plus `country`).
 * Returns the first string value under either spelling. Pure — unit-tested
 * in both shapes.
 */
export interface ChainRouteParams {
  categorySlug?: string;
  citySlug?: string;
  countrySlug?: string;
}

export function resolveChainRouteParams(
  params: Record<string, string | string[] | undefined>,
): ChainRouteParams {
  const first = (value: string | string[] | undefined): string | undefined => {
    const raw = Array.isArray(value) ? value[0] : value;
    return raw ? decodeURIComponent(raw) : undefined;
  };
  return {
    categorySlug: first(params.category),
    citySlug: first(params.cities) ?? first(params.city),
    countrySlug: first(params.country),
  };
}

/**
 * 301 target for a city-hub URL reached through the WRONG shape for the
 * active pattern, preserving the locale prefix. Returns null when the path
 * already matches the active shape (or is not a two-segment chain path).
 * Used by the named redirect middleware on both hub page routes; the global
 * middleware additionally rewrites the /country/** legacy forms when the
 * country-first pattern is active.
 */
export function cityHubRedirectPath(path: string): string | null {
  const { prefix, segments } = splitLocalePrefix(path);
  if (segments[0] === "country" && segments.length === 3) {
    // Country-prefixed hub /country/{c}/{x} — canonical only in category-city.
    if (CITY_URL_PATTERN === "country-city-category") {
      return `${prefix}/${segments[1]}/${segments[2]}`;
    }
    return null;
  }
  if (segments.length === 2 && segments[0] !== "country") {
    // Bare chain /{c}/{x} — canonical only in country-city-category.
    if (CITY_URL_PATTERN === "category-city") {
      return `${prefix}/country/${segments[0]}/${segments[1]}`;
    }
    return null;
  }
  return null;
}

/**
 * 301 target for a category × city URL reached through the wrong shape for
 * the active pattern, preserving the locale prefix. `categorySlug` must be
 * the already-resolved URL slug (same rule as categoryCityPath). Returns
 * null when the path already matches the active shape.
 */
export function categoryCityRedirectPath(
  path: string,
  categorySlug: string,
  countrySlug: string,
  citySlug: string,
): string | null {
  const { prefix, segments } = splitLocalePrefix(path);
  if (CITY_URL_PATTERN === "category-city") {
    // Country-first chain form /{c}/{x}/{cat} → categories shape.
    if (segments[0] !== "country" && segments.length === 3) {
      return `${prefix}/categories/${categorySlug}/${citySlug}`;
    }
    return null;
  }
  // Categories shape /categories/{cat}/{city} → country-first chain. The
  // country is unknown from the URL — callers resolve it server-side
  // (/api/cities/resolve) and build categoryCityPath themselves; this helper
  // only handles the already-known-country form (country-first page routes).
  if (segments[0] === "categories" && segments.length === 3) {
    return `${prefix}${categoryCityPath("country-city-category", categorySlug, countrySlug, citySlug)}`;
  }
  return null;
}

/**
 * Locale-prefixed country-first chain URL for a category × city page — the
 * sitemap-side counterpart of categoryCityPath that resolves the category
 * slug per LOCALE itself (sitemap emission has no i18n runtime). fr (the
 * default locale) gets no prefix, mirroring buildCategoryPath.
 */
export function buildChainCategoryPath(
  locale: string,
  canonicalSlug: string,
  countrySlug: string,
  citySlug: string,
): string {
  const categorySlug =
    getActivityLocaleSlug(canonicalSlug, locale) ?? canonicalSlug;
  const localePrefix =
    locale === directoryConfig.defaultLocale ? "" : `/${locale}`;
  return `${localePrefix}/${countrySlug}/${citySlug}/${categorySlug}`;
}

/**
 * hreflang alternates for a country-first chain category × city URL. Same
 * shape as buildCategorySitemapAlternatives (Array<{hreflang, href}>) but
 * emitted in the chain shape, per ACTIVE locale (directoryConfig.locales —
 * unlike the /categories builder, no inactive-locale hrefs).
 */
export function buildChainCategorySitemapAlternatives(
  canonicalSlug: string,
  countrySlug: string,
  citySlug: string,
  siteUrl: string = directoryConfig.url,
): Array<{ hreflang: string; href: string }> {
  return directoryConfig.locales.map((loc) => ({
    hreflang: hreflangOf(loc) ?? loc,
    href: `${siteUrl}${buildChainCategoryPath(loc, canonicalSlug, countrySlug, citySlug)}`,
  }));
}
