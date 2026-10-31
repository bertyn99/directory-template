import { isSiloSpokeType } from "~~/shared/silo";
import {
  CITY_URL_PATTERN,
  categoryCityRedirectPath,
} from "~~/shared/city-chain";
import {
  findActivityDefinition,
  getActivityLocaleSlug,
} from "~~/shared/activities";

/**
 * Named route middleware on BOTH category × city routes:
 *
 * - /{country}/{city}/{category} ([country]/[city]/[category].vue): canonical
 *   in 'country-city-category'; in 'category-city' mode 301 to the
 *   categories shape, preserving the locale prefix.
 * - /categories/{category}/{cities} (the dispatcher): canonical in
 *   'category-city'; in 'country-city-category' mode 301 to the chain — the
 *   country is unknown from the URL, so it is resolved server-side through
 *   GET /api/cities/resolve (unknown city ⇒ no redirect; the page renders
 *   its noindexed empty state). Silo spokes keep the /categories URL in both
 *   patterns; unknown categories are left to the page's own 404.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const countryParam = to.params.country;
  const countrySlug =
    typeof countryParam === "string" ? countryParam : undefined;

  if (countrySlug) {
    // Country-first chain route — only the categories-shape redirect applies.
    const cityParam = to.params.city;
    const categoryParam = to.params.category;
    const citySlug =
      typeof cityParam === "string" ? decodeURIComponent(cityParam) : undefined;
    const categorySlug =
      typeof categoryParam === "string"
        ? decodeURIComponent(categoryParam)
        : undefined;
    if (!citySlug || !categorySlug) return;

    const def = findActivityDefinition(categorySlug);
    const resolvedCategorySlug =
      (def && (getActivityLocaleSlug(def.slug, useNuxtApp().$i18n.locale.value) ?? def.slug)) ??
      categorySlug;

    const redirectPath = categoryCityRedirectPath(
      to.path,
      resolvedCategorySlug,
      countrySlug,
      citySlug,
    );
    if (redirectPath && redirectPath !== to.path) {
      return navigateTo(redirectPath, { redirectCode: 301, replace: true });
    }
    return;
  }

  // Dispatcher route.
  if (CITY_URL_PATTERN !== "country-city-category") return;

  const citiesParam = to.params.cities;
  const citySlug =
    typeof citiesParam === "string" ? decodeURIComponent(citiesParam) : undefined;
  if (!citySlug || isSiloSpokeType(citySlug)) return;

  const categoryParam = to.params.category;
  const incomingCategorySlug =
    typeof categoryParam === "string"
      ? decodeURIComponent(categoryParam)
      : undefined;
  const def = incomingCategorySlug
    ? findActivityDefinition(incomingCategorySlug)
    : undefined;
  if (!def) return; // unknown category: the page throws its own 404

  const requestFetch = useRequestFetch();
  const resolved = await requestFetch<{
    data: { country: { slug: string }; city: { name: string } } | null;
  }>(`/api/cities/resolve/${citySlug}`);
  if (!resolved?.data?.country?.slug) return; // unknown city: render as today

  const categoryLocaleSlug =
    getActivityLocaleSlug(def.slug, useNuxtApp().$i18n.locale.value) ??
    def.slug;
  return navigateTo(
    `/${resolved.data.country.slug}/${citySlug}/${categoryLocaleSlug}`,
    { redirectCode: 301, replace: true },
  );
});
