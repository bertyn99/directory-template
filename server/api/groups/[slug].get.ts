import { getPublicFranchiseBySlug } from "~~/server/db/queries/franchises";

// Public group page (all venues of one franchise) — NOT under /api/franchises,
// which is the owner-scoped dashboard API (auth required). Returns only the
// public-safe columns selected by the query; franchises with 0 public venues
// 404 (page-level too, via the null contract).
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
