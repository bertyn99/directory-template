import { listActivities } from "~~/server/db/queries/categories";
import { isContentLocale } from "~~/shared/silo";

function resolveLocale(raw: unknown): string {
  if (typeof raw === "string" && isContentLocale(raw)) return raw;
  return "en";
}

export default cachedEventHandler(
  async (event) => {
    try {
      const { search, locale } = getQuery(event);
      const data = await listActivities(
        search && search !== "" ? String(search) : undefined,
        resolveLocale(locale),
      );
      return { data };
    } catch (err: unknown) {
      const error = err as Error;
      throw createError({
        statusCode: 500,
        statusMessage: error.message,
      });
    }
  },
  // Hammered by the navbar mega-menu on every page — SWR-cache it.
  { maxAge: 60 * 10, swr: true },
);
