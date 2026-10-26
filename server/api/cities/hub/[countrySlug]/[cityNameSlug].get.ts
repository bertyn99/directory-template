import { getCityHubData, getNearbyCitiesWithVenues } from "~~/server/db/queries/cities";

export default defineEventHandler(async (event) => {
  const countrySlug = getRouterParam(event, "countrySlug");
  const cityNameSlug = getRouterParam(event, "cityNameSlug");

  if (!countrySlug || !cityNameSlug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing country or city parameter",
    });
  }

  const hubData = await getCityHubData(countrySlug, cityNameSlug);

  if (!hubData) {
    throw createError({
      statusCode: 404,
      statusMessage: "City not found",
    });
  }

  const nearbyCities = await getNearbyCitiesWithVenues(
    hubData.city.name,
    countrySlug,
    6,
  );

  return {
    data: {
      ...hubData,
      nearbyCities,
    },
  };
});
