import { searchCities } from "~~/server/db/queries/cities";

export default cachedEventHandler(async (event) => {
  const { search, limit } = getQuery(event);
  const parsedLimit = limit
    ? Math.min(parseInt(limit as string, 10), 100)
    : undefined;

  return searchCities({
    search: search ? String(search) : undefined,
    limit: parsedLimit && !Number.isNaN(parsedLimit) && parsedLimit > 0
      ? parsedLimit
      : undefined,
  });
}, { maxAge: 60 * 10, swr: true });
