import { getUserVenues } from "~~/server/db/queries/venues";

export default defineEventHandler(async (event) => {
  try {
    // Require a user session
    const session = await requireUserSession(event);

    const venues = await getUserVenues(session.user.id);

    return {
      data: venues,
    };
  } catch (err: unknown) {
    const error = err as Error;
    
    if (error.name === "H3Error") {
      throw error;
    }

    console.error("Error fetching user venues:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch user venues",
    });
  }
});
