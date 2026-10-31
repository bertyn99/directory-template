import { CITY_URL_PATTERN, splitLocalePrefix } from "~~/shared/city-chain";

/**
 * Legacy city-chain rewrites, keyed on directoryConfig.content.cityUrlPattern
 * (shared/city-chain.ts). Pure string rewrites — no DB access in middleware.
 *
 * ASYMMETRY (deliberate): this middleware only runs in the
 * 'country-city-category' pattern, where the /country/** hub URLs were the
 * previously-canonical shapes and must keep answering (301) for crawlers.
 * In 'category-city' mode the bare /{country}/{city} chain URLs never
 * existed as links, so there is no legacy traffic to preserve: the root
 * [country]/[city] page and the [country]/[city]/[category] page redirect
 * themselves via the named redirect-city-hub-chain / redirect-category-city
 * chain middlewares instead.
 *
 * Handled shapes (locale prefix preserved):
 * - /country/{x}/{y}            → /{x}/{y}
 * - /country/{x}/{y}/{z}        → /{x}/{y}/{z} (generic passthrough — the
 *   legacy two-segment URLs never had a category case, so no slug
 *   translation)
 * - /country/{x}                → /venues?city={x} (the single-segment city
 *   grid page was removed; /venues is the filter-driven complementary browse
 *   surface, NOT part of the chain)
 * - /country (index) and ≥4-segment paths are left untouched.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (CITY_URL_PATTERN !== "country-city-category") return;

  const { prefix, segments } = splitLocalePrefix(to.path);
  if (segments[0] !== "country") return;

  if (segments.length === 2) {
    return navigateTo(`${prefix}/venues?city=${segments[1]}`, {
      redirectCode: 301,
      replace: true,
    });
  }
  if (segments.length === 3) {
    return navigateTo(`${prefix}/${segments[1]}/${segments[2]}`, {
      redirectCode: 301,
      replace: true,
    });
  }
});
