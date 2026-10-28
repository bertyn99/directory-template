import {
  getNeighborhoodVenueCountsByCity,
  resolveActivityIdsForSlugs,
  searchVenues,
  searchVenuesInputSchema,
} from "~~/server/db/queries/venues";
import { findActivityDefinition } from "~~/shared/activities";

export default cachedEventHandler(
  async (event) => {
    try {
      const query = getQuery(event);

      // Repeated `facet=key:value` params — h3 returns a string when one is
      // given, an array when repeated. Normalized here; key/value whitelist
      // validation happens in searchVenuesInputSchema (ZodError → 400 below).
      const rawFacets = query.facet === undefined
        ? []
        : (Array.isArray(query.facet) ? query.facet : [query.facet]);

      const input = searchVenuesInputSchema.parse({
        page: query.page ? parseInt(query.page as string) : undefined,
        pageSize: query.limit ? parseInt(query.limit as string) : undefined,
        search: query.search as string | undefined,
        citySlug: query.city as string | undefined,
        zip: query.zip as string | undefined,
        countryCode: query.country as string | undefined,
        facets: rawFacets,
        locale: (query.locale as string | undefined) || undefined,
      });

      // Resolve activity slugs (e.g. "kickboxing,muay-thai") or numeric IDs
      let activityIds: number[] | undefined;
      if (query.activities) {
        const raw = (query.activities as string)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const numericIds = raw.filter((s) => /^\d+$/.test(s)).map((s) => Number(s));
        const canonicalSlugs = raw
          .filter((s) => !/^\d+$/.test(s))
          .map((s) => findActivityDefinition(s)?.slug ?? s)
          .filter(Boolean);

        // Catalog-resolved: DB rows may use a French primary slug
        // (legacy French slugs) while URLs carry canonical slugs,
        // so raw slug equality misses them — match rows via the catalog.
        activityIds = [
          ...new Set([...numericIds, ...(await resolveActivityIdsForSlugs(canonicalSlugs))]),
        ];
        if (activityIds.length === 0) {
          return {
            data: [],
            meta: {
              totalCount: 0,
              page: input.page,
              pageSize: input.pageSize,
              totalPages: 0,
              neighborhoods: [],
            },
          };
        }
      }

      const [result, neighborhoods] = await Promise.all([
        searchVenues({ ...input, activityIds }),
        input.citySlug
          ? getNeighborhoodVenueCountsByCity(input.citySlug, activityIds ?? [])
          : Promise.resolve(undefined),
      ]);

      return {
        data: result.venues,
        meta: {
          totalCount: result.totalCount,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
          ...(neighborhoods ? { neighborhoods } : {}),
        },
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error searching venues:", error);

      // Handle validation errors
      if (error.name === "ZodError") {
        throw createError({
          status: 400,
          statusText: "Invalid query parameters",
          data: error,
        });
      }

      throw createError({
        status: 500,
        statusText: "Failed to search venues",
      });
    }
  },
  { maxAge: 60 * 5, swr: true },
);
