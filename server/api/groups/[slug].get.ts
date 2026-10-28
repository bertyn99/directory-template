import { getPublicFranchiseBySlug } from "~~/server/db/queries/franchises";

export default defineEventHandler(async (event) => {
  const slug = event.context.params?.slug;
  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Group slug is required",
    });
  }

  const franchise = await getPublicFranchiseBySlug(slug);
  if (!franchise) {
    throw createError({
      statusCode: 404,
      statusMessage: "Group not found",
    });
  }

  return { data: franchise };
});
