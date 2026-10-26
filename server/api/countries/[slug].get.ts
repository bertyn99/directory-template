import { getCitiesByCountrySlug } from "~~/server/db/queries/countries";

export default defineEventHandler(async (event) => {
  const countrySlug = event.context.params?.slug;
  const search = getQuery(event).search as string | undefined;

  if (!countrySlug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Country slug is required",
    });
  }

  try {
    const results = await getCitiesByCountrySlug(countrySlug, { search });
    return { cities: results };
  } catch (error) {
    console.error("Error fetching cities by country:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  }
});
