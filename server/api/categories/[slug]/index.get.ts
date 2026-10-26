import { getActivityBySlug } from "~~/server/db/queries/categories";

export default defineEventHandler(async (event) => {
  try {
    const slugCategory = getRouterParam(event, "slug");
    const { locale } = getQuery(event);

    if (!slugCategory) {
      throw createError({ statusCode: 400, statusMessage: "Missing slug" });
    }

    const category = await getActivityBySlug(
      slugCategory,
      locale && typeof locale === "string" ? locale : undefined,
    );

    if (!category) {
      throw createError({
        statusCode: 404,
        statusMessage: "Category not found",
      });
    }

    return { category };
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    if (error.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: error.message ?? "Internal Server Error",
    });
  }
});
