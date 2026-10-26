// Shared route helpers. Nuxt auto-imports functions from app/utils.

/**
 * Public category-silo city URL: /categories/{category}/{city-slug}.
 * Used by CityLinks and VenueCta — keep single source of truth.
 */
export function categoryCityPath(
  localePath: (path: string) => string,
  localeSlug: string,
  city: string,
): string {
  return localePath(`/categories/${localeSlug}/${city.toLowerCase().replace(/\s+/g, "-")}`);
}
