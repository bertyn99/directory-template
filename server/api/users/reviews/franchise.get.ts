import { getFranchiseReviews } from "~~/server/db/queries/reviews";
import { isFranchiseOwner } from "~~/server/db/queries/franchiseVenues";
import { manageFranchiseVenues } from "~~/shared/utils/abilities";

export default defineEventHandler(async (event) => {
  try {
    const session = await requireUserSession(event);

    const query = getQuery(event);
    const franchiseId = Number(query.franchiseId);

    if (!franchiseId || Number.isNaN(franchiseId)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Valid franchise ID is required",
      });
    }

    // Verify franchise ownership
    const isOwner = await isFranchiseOwner(franchiseId, session.user.id);
    await authorize(event, manageFranchiseVenues, isOwner);

    const data = await getFranchiseReviews(franchiseId);

    return { data };
  } catch (err: unknown) {
    const error = err as Error;

    if (error.name === "H3Error") {
      throw error;
    }

    console.error("Error fetching franchise reviews:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch franchise reviews",
    });
  }
});
