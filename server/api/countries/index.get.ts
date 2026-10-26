import { getCountriesWithCounts } from "~~/server/db/queries/countries";

export default cachedEventHandler(
  async () => {
    try {
      const result = await getCountriesWithCounts();
      return { countries: result };
    } catch (error) {
      console.error("Error fetching countries:", error);
      return createError({
        statusCode: 500,
        statusMessage: "Internal Server Error",
      });
    }
  },
  { maxAge: 60 * 60 * 2 },
);
