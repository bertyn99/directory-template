import { getCountryByCitySlug } from "~~/server/db/queries/cities";

/**
 * Resolve a public city slug (`paris`, `paris-75011`, `lisboa`) to its
 * country slug + canonical city name. Used by the categories dispatcher's
 * redirect middleware to rewrite legacy /categories/{category}/{city} URLs to
 * the country-first chain (/{country}/{city}/{category}) — the country is
 * unknown from that URL alone, hence this lookup.
 *
 * Unknown city ⇒ `{ data: null }` (200, not 404): the middleware skips the
 * redirect and the page renders its own (noindexed) empty state.
 */
export default defineEventHandler(async (event) => {
  const citySlug = getRouterParam(event, "city");

  if (!citySlug) {
    throw createError({
      statusCode: 400,
      statusMessage: "City slug is required",
    });
  }

  const resolved = await getCountryByCitySlug(citySlug);

  if (!resolved) {
    return { data: null };
  }

  return {
    data: {
      country: { slug: resolved.slug },
      city: { name: resolved.cityName },
    },
  };
});
