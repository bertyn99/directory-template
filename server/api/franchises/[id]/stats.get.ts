import { getFranchiseStats } from "~~/server/db/queries/analytics";
import { getFranchiseByIdAndOwnerId } from "~~/server/db/queries/franchises";
import { manageFranchiseVenues } from "~~/shared/utils/abilities";

export default defineEventHandler(async (event) => {
  try {
    const session = await requireUserSession(event);

    const id = getRouterParam(event, "id");
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: "Missing franchise ID" });
    }

    const franchiseId = parseInt(id);
    if (isNaN(franchiseId)) {
      throw createError({ statusCode: 400, statusMessage: "Invalid franchise ID" });
    }

    // Verify franchise ownership
    const franchise = await getFranchiseByIdAndOwnerId(franchiseId, session.user.id);
    const isOwner = !!franchise;

    if (!manageFranchiseVenues(session.user, isOwner)) {
      throw createError({
        statusCode: 403,
        statusMessage: "Access denied",
      });
    }

    const stats = await getFranchiseStats(franchiseId);

    return {
      data: stats,
    };
  } catch (err: unknown) {
    const error = err as Error;

    if (error.name === "H3Error") {
      throw error;
    }

    console.error("Error fetching franchise stats:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch franchise stats",
    });
  }
});
