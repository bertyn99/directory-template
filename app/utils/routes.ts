// Shared route helpers. Nuxt auto-imports functions from app/utils.
import {
  CITY_URL_PATTERN,
  categoryCityPath as sharedCategoryCityPath,
} from "~~/shared/city-chain";

/**
 * Chain-aware category × city URL for city cards and CTAs (CityLinks,
 * VenueCta). Resolves the ACTIVE `content.cityUrlPattern` shape: the
 * country-first chain (/{country}/{city}/{category}) when a country slug is
 * available, the /categories/{category}/{city} URL otherwise. That fallback
 * is deliberately the legacy shape — the dispatcher middleware resolves the
 * country and 301s server-side, so the link never dead-ends (at the cost of
 * one redirect hop for cards whose city is absent from the country map).
 * `localePath` stays a parameter: the caller owns locale-prefix semantics.
 */
export function categoryCityCardPath(
  localePath: (path: string) => string,
  localeSlug: string,
  city: string,
  countrySlug?: string | null,
): string {
  const citySlug = city.toLowerCase().replace(/\s+/g, "-");
  const countrySlugParam =
    CITY_URL_PATTERN === "country-city-category"
      ? (countrySlug ?? undefined)
      : undefined;
  return localePath(
    countrySlugParam
      ? sharedCategoryCityPath(
          CITY_URL_PATTERN,
          localeSlug,
          countrySlugParam,
          citySlug,
        )
      : `/categories/${localeSlug}/${citySlug}`,
  );
}
