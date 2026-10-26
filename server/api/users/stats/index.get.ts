import { getOwnerVenueStats } from "~~/server/db/queries/analytics";

export default defineEventHandler(async (event) => {
  try {
    const session = await requireUserSession(event);

    const stats = await getOwnerVenueStats(session.user.id);

    return {
      data: stats,
    };
  } catch (err: unknown) {
    const error = err as Error;

    if (error.name === "H3Error") {
      throw error;
    }

    console.error("Error fetching user stats:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch user stats",
    });
  }
});
