import { getActivitiesByCitySlug } from "~~/server/db/queries/cities";

export default defineEventHandler(async (event) => {
  const citySlug = event.context.params?.citySlug;

  if (!citySlug) {
    throw createError({
      statusCode: 400,
      statusMessage: "City slug is required",
    });
  }

  return getActivitiesByCitySlug(citySlug);
});
