import { getSiteStats } from "~~/server/db/queries/stats";

export default cachedEventHandler(async () => {
  try {
    const stats = await getSiteStats();
    return { data: stats };
  } catch (error) {
    console.error("Error fetching site stats:", error);
    return createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  }
}, { maxAge: 60 * 60 * 12 });
