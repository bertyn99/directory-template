import { getVenueReviews } from "~~/server/db/queries/reviews";

export default defineEventHandler(async (event) => {
  try {
    const venueId = Number(getRouterParam(event, "venueId"));
    if (!venueId || Number.isNaN(venueId)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Valid venue ID is required",
      });
    }

    const query = getQuery(event);
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

    const result = await getVenueReviews(venueId, page, pageSize);

    return result;
  } catch (err: unknown) {
    const error = err as Error;

    if (error.name === "H3Error") {
      throw error;
    }

    console.error("Error fetching venue reviews:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch venue reviews",
    });
  }
});
