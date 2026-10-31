import { cityHubRedirectPath } from "~~/shared/city-chain";

/**
 * Named route middleware on BOTH city-hub routes (/{country}/{city} and
 * /country/{country}/{city}): 301 to the canonical shape for the active
 * cityUrlPattern, preserving the locale prefix. The shape detection lives in
 * cityHubRedirectPath (shared/city-chain.ts, unit-tested) — this file is the
 * thin Nuxt binding. The global redirect-city-chain middleware additionally
 * rewrites the /country/** legacy forms in country-first mode; this page
 * middleware stays as the client-side-nav safety net for both directions.
 */
export default defineNuxtRouteMiddleware((to) => {
  const redirectPath = cityHubRedirectPath(to.path);
  if (redirectPath && redirectPath !== to.path) {
    return navigateTo(redirectPath, { redirectCode: 301, replace: true });
  }
});
