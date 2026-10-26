import { getOwnerVenueReviews } from "~~/server/db/queries/reviews";

export default defineEventHandler(async (event) => {
  try {
    const session = await requireUserSession(event);
    const data = await getOwnerVenueReviews(session.user.id);
    return { data };
  } catch (err: unknown) {
    const error = err as Error;

    if (error.name === "H3Error") {
      throw error;
    }

    console.error("Error fetching user venue reviews:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch user venue reviews",
    });
  }
});
