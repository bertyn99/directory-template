import {
  getMajorEuCitiesWithVenueCountByActivitySlug,
  getTopCountryCitiesWithVenueCountByActivitySlug,
} from "~~/server/db/queries/venues";
import { getCountryByCitySlug } from "~~/server/db/queries/cities";
import { majorEuCityFromPublicSlug } from "~~/shared/major-eu-cities";

export default defineEventHandler(async (event) => {
  try {
    const slug = event.context.params?.slug;

    if (!slug) {
      throw createError({
        status: 400,
        statusText: "Activity slug is required",
      });
    }

    const query = getQuery(event);
    const citySlug =
      typeof query.city === "string" && query.city.length > 0
        ? query.city
        : undefined;

    // eu list and country resolution are independent — run them in parallel.
    const [eu, country] = await Promise.all([
      getMajorEuCitiesWithVenueCountByActivitySlug(slug),
      citySlug ? getCountryByCitySlug(citySlug) : Promise.resolve(null),
    ]);
    const countryCities = country
      ? await getTopCountryCitiesWithVenueCountByActivitySlug(
          slug,
          country.code,
          country.cityName,
        )
      : [];

    return {
      data: {
        eu,
        country: country
          ? { code: country.code, cities: countryCities }
          : null,
        // Canonical name slug for the requested city — pages 301 zip/alias
        // variants (paris-75011, lisboa) to this form. Catalog major-city
        // names win over DB rows (Lisboa/Lisbon).
        canonicalCitySlug: (() => {
          const catalogCity = citySlug ? majorEuCityFromPublicSlug(citySlug) : null;
          const name = catalogCity ?? country?.cityName;
          return name ? name.toLowerCase().replace(/\s+/g, "-") : null;
        })(),
      },
    };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "statusCode" in err) {
      throw err;
    }

    console.error("Error fetching cities by activity:", err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch cities",
    });
  }
});
