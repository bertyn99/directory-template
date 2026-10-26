import { getFranchiseByIdAndOwnerId } from "~~/server/db/queries/franchises";
import { getFranchiseVenuesList } from "~~/server/db/queries/franchiseVenues";
import { manageFranchiseVenues } from "~~/shared/utils/abilities";

export default defineEventHandler(async (event) => {
  try {
    const session = await requireUserSession(event);

    const id = getRouterParam(event, "id");
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: "Missing franchise ID" });
    }

    const franchiseId = parseInt(id);
    if (Number.isNaN(franchiseId)) {
      throw createError({ statusCode: 400, statusMessage: "Invalid franchise ID" });
    }

    const franchise = await getFranchiseByIdAndOwnerId(franchiseId, session.user.id);
    const isOwner = !!franchise;

    if (!manageFranchiseVenues(session.user, isOwner)) {
      throw createError({
        statusCode: 403,
        statusMessage: "Access denied",
      });
    }

    const franchiseVenues = await getFranchiseVenuesList(franchiseId);

    return { data: franchiseVenues };
  } catch (err: unknown) {
    const error = err as Error;

    if (error.name === "H3Error") {
      throw error;
    }

    console.error("Error fetching franchise venues:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch franchise venues",
    });
  }
});
