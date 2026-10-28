import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { matchCityPublicSlug } from "~~/server/db/queries/cities";
import {
  activities,
  addresses,
  cities,
  venueActivities,
  venues,
  countries,
  franchises,
  userVenues,
} from "~~/server/db/schemas";
import { useDrizzle } from "~~/server/utils/drizzle";
import {
  ACTIVITY_ALIASES,
  findActivityDefinitionForRow,
  getActivityDisplayNameForRow,
} from "~~/shared/activities";
import { majorEuCityLookupNames, toMajorEuCityCards } from "~~/shared/major-eu-cities";
import { parseFacetFilters, type FacetFilter } from "~~/shared/facets";
import { z } from "zod";

// Input validation schemas
export const searchVenuesInputSchema = z.object({
  search: z.string().optional(),
  citySlug: z.string().optional(),
  zip: z.string().optional(),
  countryCode: z.string().optional(),
  activityIds: z.array(z.number()).optional().default([]),
  // Raw `facet=key:value` params (repeated). Validated against the config
  // facet whitelist (shared/facets.ts): an unknown key, a non-filterable key
  // or a non-whitelisted value raises the same ZodError → 400 convention as
  // every other invalid query parameter on this route.
  facets: z
    .array(z.string())
    .optional()
    .default([])
    .transform((raw, ctx) => {
      const parsed = parseFacetFilters(raw);
      if (parsed === null) {
        ctx.addIssue({
          code: "custom",
          message: "Unknown facet filter (expected key:value from taxonomy.facets)",
        });
        return z.NEVER;
      }
      return parsed;
    }),
  locale: z.string().optional().default("en"),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().max(100).optional().default(20),
});

export type SearchVenuesInput = z.infer<typeof searchVenuesInputSchema>;

/**
 * JSONB attribute conditions for validated facet filters, AND-composed by the
 * caller. SQL shape: `attributes ->> key = value` (boolean facets only ever
 * filter `value = 'true'`). Both key and value are BOUND params; the key has
 * already been matched against the config whitelist (parseFacetFilters), so
 * no client string ever becomes a JSONB path. A venue with NULL attributes
 * (or a missing key) never matches.
 */
function facetAttributeConditions(facets: readonly FacetFilter[]): SQL[] {
  return facets.map((facet) =>
    sql`${venues.attributes} ->> ${facet.key} = ${facet.value}`,
  );
}

/** Alias slugs that map to the same catalog category as the selected activity IDs */
async function aliasSlugsForSelectedActivityIds(
  db: ReturnType<typeof useDrizzle>,
  activityIds: number[],
): Promise<string[]> {
  if (activityIds.length === 0) return [];

  const selected = await db
    .select({ slug: activities.slug })
    .from(activities)
    .where(inArray(activities.id, activityIds));

  const canonicalSlugs = new Set<string>();
  for (const row of selected) {
    const canonical = ACTIVITY_ALIASES[row.slug] ?? row.slug;
    canonicalSlugs.add(canonical);
  }

  return Object.entries(ACTIVITY_ALIASES)
    .filter(([, canonical]) => canonicalSlugs.has(canonical))
    .map(([aliasSlug]) => aliasSlug);
}

/**
 * Resolve activity IDs for slugs given in catalog terms (URLs carry English
 * canonical slugs), while DB rows may still use a legacy primary slug —
 * match rows through the activity
 * catalog, same as listActivities. Alias rows that fold into the same catalog
 * category are included, matching the aliasSlugsForSelectedActivityIds intent.
 */
export async function resolveActivityIdsForSlugs(slugs: string[]): Promise<number[]> {
  if (slugs.length === 0) return [];

  const targets = new Set(slugs.map((s) => s.toLowerCase()));
  const db = useDrizzle();
  const rows = await db
    .select({
      id: activities.id,
      slug: activities.slug,
      name: activities.name,
      slugs: activities.slugs,
    })
    .from(activities);

  const ids = new Set<number>();
  for (const row of rows) {
    if (targets.has(row.slug.toLowerCase())) {
      ids.add(row.id);
      continue;
    }
    const canonical = findActivityDefinitionForRow(row)?.slug;
    if (canonical && targets.has(canonical.toLowerCase())) {
      ids.add(row.id);
    }
  }
  return [...ids];
}

export interface SearchVenuesResult {
  venues: Array<{
    id: number;
    name: string;
    slug: string;
    categoryId: number | null;
    description: unknown;
    website: string | null;
    tel: string | null;
    updatedAt: Date | null;
    address: {
      street1: string;
      lat: string | null;
      lng: string | null;
      city: {
        name: string;
        slug: string;
        zip: string | null;
        country: string;
      };
    } | null;
    activities: string[];
  }>;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Search venues with filters and pagination (lean list query + activities batch).
 */
export async function searchVenues(params: SearchVenuesInput): Promise<SearchVenuesResult> {
  const {
    search = "",
    citySlug,
    zip,
    countryCode,
    activityIds = [],
    facets = [],
    locale = "en",
    page = 1,
    pageSize = 20,
  } = params;

  const offset = (page - 1) * pageSize;
  const db = useDrizzle();
  const filters = [eq(venues.statusCode, "active")];

  if (search) {
    const term = search.trim();
    filters.push(
      sql`(
        (${venues.normalizedName} IS NOT NULL AND ${venues.normalizedName} % ${term})
        OR ${venues.name} ILIKE ${`%${term}%`}
      )`,
    );
  }

  if (citySlug) {
    filters.push(matchCityPublicSlug(citySlug));
  }

  if (zip) {
    filters.push(eq(cities.zip, zip));
  }

  if (countryCode) {
    filters.push(eq(countries.code, countryCode));
  }

  if (activityIds.length > 0) {
    const aliasSlugs = await aliasSlugsForSelectedActivityIds(db, activityIds);
    if (aliasSlugs.length > 0) {
      // Include leftover alias rows until a migration remaps them
      filters.push(
        sql`EXISTS (
          SELECT 1 FROM ${venueActivities}
          INNER JOIN ${activities} ON ${activities.id} = ${venueActivities.activityId}
          WHERE ${venueActivities.venueId} = ${venues.id}
          AND (
            ${inArray(venueActivities.activityId, activityIds)}
            OR ${inArray(activities.slug, aliasSlugs)}
          )
        )`,
      );
    } else {
      filters.push(
        sql`EXISTS (
          SELECT 1 FROM ${venueActivities}
          WHERE ${venueActivities.venueId} = ${venues.id}
          AND ${inArray(venueActivities.activityId, activityIds)}
        )`,
      );
    }
  }

  // Facet filters AND-compose like the activity filter above; the window
  // count (count(*) over()) reads the same WHERE clause, so list + count
  // stay pagination-consistent by construction.
  filters.push(...facetAttributeConditions(facets));

  const whereClause = and(...filters);

  const rows = await db
    .select({
      id: venues.id,
      name: venues.name,
      slug: venues.slug,
      categoryId: venues.categoryId,
      description: venues.description,
      website: venues.website,
      tel: venues.tel,
      updatedAt: venues.updatedAt,
      address: {
        street1: addresses.street1,
        lat: addresses.lat,
        lng: addresses.lng,
        city: {
          name: cities.name,
          slug: cities.slug,
          zip: cities.zip,
          country: countries.name,
        },
      },
      totalCount: sql<number>`count(*) over()`.mapWith(Number).as("total_count"),
    })
    .from(venues)
    .leftJoin(addresses, eq(venues.addressId, addresses.id))
    .leftJoin(cities, eq(addresses.cityId, cities.id))
    .leftJoin(countries, eq(cities.countryId, countries.id))
    .where(whereClause)
    .limit(pageSize)
    .offset(offset);

  const totalCount = rows[0]?.totalCount ?? 0;
  const venueIds = rows.map((row) => row.id);
  const activitiesByVenue = new Map<number, string[]>();

  if (venueIds.length > 0) {
    const activityRows = await db
      .select({
        venueId: venueActivities.venueId,
        id: activities.id,
        name: activities.name,
        slug: activities.slug,
        slugs: activities.slugs,
      })
      .from(venueActivities)
      .innerJoin(activities, eq(venueActivities.activityId, activities.id))
      .where(inArray(venueActivities.venueId, venueIds))
      .orderBy(asc(activities.name));

    for (const row of activityRows) {
      const list = activitiesByVenue.get(row.venueId) ?? [];
      list.push(getActivityDisplayNameForRow(row, locale));
      activitiesByVenue.set(row.venueId, list);
    }
  }

  const venueResults = rows.map(({ totalCount: _total, ...venue }) => ({
    ...venue,
    activities: activitiesByVenue.get(venue.id) ?? [],
  }));

  return {
    venues: venueResults,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

/**
 * Get a single venue by slug with full details
 */
export async function getVenueBySlug(slug: string) {
  const result = await useDrizzle().query.venues.findFirst({
    where: { slug },
    with: {
      address: {
        with: {
          city: {
            columns: {
              zip: false,
            },
            with: {
              country: {
                columns: {
                  id: false,
                },
              },
            },
          },
        },
      },
      activities: {
        with: {
          activity: {
            columns: {
              name: true,
            },
          },
        },
      },
      // Public venue page surfaces: prices (formulas), equipment names and
      // the venues.attributes JSONB (selected with the row itself).
      formulas: true,
      equipments: {
        with: {
          equipment: {
            columns: {
              name: true,
            },
          },
        },
      },
      franchise: {
        columns: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  });

  if (!result) {
    return null;
  }

  return {
    ...result,
    activities: result.activities.map((ca) => ca.activity.name),
    equipments: result.equipments.map((ve) => ve.equipment.name),
  };
}

/**
 * Venue detail for owner/franchise edit — venue + ownership flags (3 reads).
 */
export async function getOwnedVenueBySlug(slug: string, userId: string) {
  const db = useDrizzle();

  const venue = await db.query.venues.findFirst({
    where: { slug },
    with: {
      address: {
        with: {
          city: {
            columns: { zip: false },
            with: { country: { columns: { id: false } } },
          },
        },
      },
      activities: {
        with: { activity: { columns: { name: true } } },
      },
    },
  });

  if (!venue) return null;

  const ownership = await db.query.userVenues.findFirst({
    where: { AND: [{ userId }, { venueId: venue.id }] },
  });

  let isFranchiseOwner = false;
  if (venue.franchiseId) {
    const [franchise] = await db
      .select({ id: franchises.id })
      .from(franchises)
      .where(and(eq(franchises.id, venue.franchiseId), eq(franchises.ownerId, userId)));
    isFranchiseOwner = !!franchise;
  }

  return {
    venue: {
      ...venue,
      activities: venue.activities.map((ca) => ca.activity.name),
    },
    isOwner: !!ownership,
    isFranchiseOwner,
  };
}

/**
 * Get cities with venue count filtered by activity slug
 */
export async function getCitiesWithVenueCountByActivitySlug(
  activitySlug: string,
  limit: number = 12,
) {
  const result = await useDrizzle()
    .select({
      name: cities.name,
      slug: cities.slug,
      venueCount: sql<number>`COALESCE(COUNT(DISTINCT ${venues.id}), 0)`.as("venue_count"),
    })
    .from(cities)
    .leftJoin(addresses, eq(cities.id, addresses.cityId))
    .leftJoin(venues, eq(addresses.id, venues.addressId))
    .leftJoin(venueActivities, eq(venues.id, venueActivities.venueId))
    .leftJoin(activities, eq(venueActivities.activityId, activities.id))
    .where(
      sql`${activities.slug} = ${activitySlug} OR EXISTS (
        SELECT 1 FROM jsonb_each_text(${activities.slugs}) AS s(key, value) WHERE s.value = ${activitySlug}
      )`,
    )
    .groupBy(cities.id, cities.name, cities.slug, activities.slug)
    .orderBy(desc(sql`venue_count`), asc(cities.name))
    .limit(limit);

  return result;
}

/**
 * Resolve an activity slug to the SQL fragment matching its activity ids
 * (shared by the major-cities queries below). DB rows may use a French
 * primary slug while the incoming slug is expressed in catalog terms, so
 * rows are matched through the activity catalog.
 */
async function activityMatchSqlForSlug(activitySlug: string) {
  const activityIds = await resolveActivityIdsForSlugs([activitySlug]);

  if (activityIds.length === 0) return sql`false`;
  return sql`ca.activity_id IN (${sql.join(
    activityIds.map((id) => sql`${id}`),
    sql`, `,
  )})`;
}

/**
 * Raw per-name venue counts for an activity. `cities` rows are stored per zip,
 * so rows repeat a city name (one per arrondissement/zip).
 */
async function getNamedCitiesWithVenueCountByActivitySlug(
  activitySlug: string,
  cityNames: string[],
): Promise<Array<{ name: string; venueCount: number }>> {
  const db = useDrizzle();
  const activityMatch = await activityMatchSqlForSlug(activitySlug);

  const cityNameList = sql.join(
    cityNames.map((name) => sql`${name}`),
    sql`, `,
  );

  const result = await db.execute(sql`
    SELECT
      c.name as name,
      COALESCE(COUNT(DISTINCT cl.id), 0)::int as venue_count
    FROM cities c
    LEFT JOIN addresses a ON a.city_id = c.id
    LEFT JOIN venues cl ON cl.address_id = a.id
      AND cl.status = 'active'
      AND EXISTS (
        SELECT 1 FROM venue_activities ca
        JOIN activities act ON ca.activity_id = act.id
        WHERE ca.venue_id = cl.id
        AND ${activityMatch}
      )
    WHERE c.name IN (${cityNameList})
    GROUP BY c.name
    ORDER BY venue_count DESC, c.name ASC
  `);

  const rows = (result as { rows: Array<Record<string, unknown>> }).rows;

  return rows.map((row) => ({
    name: row.name as string,
    venueCount: Number(row.venue_count),
  }));
}

/**
 * Get major EU cities (biggest city per supported market, including Portugal)
 * with venue count filtered by activity slug. Cities with 0 venues are included.
 * Groups by city name (not individual zip-code rows) to produce one result per city.
 */
export async function getMajorEuCitiesWithVenueCountByActivitySlug(activitySlug: string) {
  const rows = await getNamedCitiesWithVenueCountByActivitySlug(
    activitySlug,
    majorEuCityLookupNames(),
  );

  return toMajorEuCityCards(rows);
}

/**
 * Top cities of one country with venue count filtered by activity slug.
 * Works for every supported country (scoped by ISO country code). Cities with
 * a known population (top-30, set by the generate:city-covers task) rank by
 * population; the rest rank by venue count. Only cities with venues are
 * returned; the current city is excluded by canonical name when provided.
 */
export async function getTopCountryCitiesWithVenueCountByActivitySlug(
  activitySlug: string,
  countryCode: string,
  excludeCityName?: string,
  limit = 10,
) {
  const db = useDrizzle();
  const activityMatch = await activityMatchSqlForSlug(activitySlug);

  const result = await db.execute(sql`
    SELECT
      c.name as name,
      MAX(c.cover) as cover,
      COUNT(DISTINCT cl.id)::int as venue_count
    FROM cities c
    JOIN countries co ON co.id = c.country_id AND co.code = ${countryCode}
    JOIN addresses a ON a.city_id = c.id
    JOIN venues cl ON cl.address_id = a.id
      AND cl.status = 'active'
      AND EXISTS (
        SELECT 1 FROM venue_activities ca
        JOIN activities act ON ca.activity_id = act.id
        WHERE ca.venue_id = cl.id
        AND ${activityMatch}
      )
    WHERE c.name <> ${excludeCityName ?? ""}
    GROUP BY c.name
    HAVING COUNT(DISTINCT cl.id) > 0
    ORDER BY MAX(c.population) DESC NULLS LAST, venue_count DESC, c.name ASC
    LIMIT ${limit}
  `);

  const rows = (result as { rows: Array<Record<string, unknown>> }).rows;

  return rows.map((row) => ({
    name: row.name as string,
    cover: (row.cover as string | null) ?? null,
    venueCount: Number(row.venue_count),
  }));
}

/**
 * Get venues for a specific user
 */
export async function getUserVenues(userId: string) {
  const results = await useDrizzle()
    .select({
      id: venues.id,
      name: venues.name,
      slug: venues.slug,
      description: venues.description,
      tel: venues.tel,
      statusCode: venues.statusCode,
      rating: venues.rating,
      updatedAt: venues.updatedAt,
      cityName: cities.name,
      franchiseId: venues.franchiseId,
    })
    .from(venues)
    .leftJoin(userVenues, eq(venues.id, userVenues.venueId))
    .leftJoin(addresses, eq(venues.addressId, addresses.id))
    .leftJoin(cities, eq(addresses.cityId, cities.id))
    .where(eq(userVenues.userId, userId));

  return results;
}

/**
 * Get all venue slugs with updatedAt for sitemap generation
 */
export async function getAllVenueSlugs() {
  return useDrizzle()
    .select({ slug: venues.slug, updatedAt: venues.updatedAt })
    .from(venues)
    .where(eq(venues.statusCode, "active"));
}

export async function getCityBySlug(slug: string) {
  return useDrizzle()
    .select({ id: cities.id, name: cities.name, slug: cities.slug })
    .from(cities)
    .where(eq(cities.slug, slug))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

export async function getNeighborhoodVenueCountsByCity(
  citySlug: string,
  activityIds: number[] = [],
): Promise<Array<{ zip: string; venueCount: number }>> {
  const db = useDrizzle();
  const filters = [
    matchCityPublicSlug(citySlug),
    eq(venues.statusCode, "active"),
    sql`${cities.zip} IS NOT NULL AND ${cities.zip} != ''`,
  ];

  if (activityIds.length > 0) {
    filters.push(
      sql`EXISTS (
        SELECT 1 FROM ${venueActivities}
        WHERE ${venueActivities.venueId} = ${venues.id}
        AND ${inArray(venueActivities.activityId, activityIds)}
      )`,
    );
  }

  const rows = await db
    .select({
      zip: cities.zip,
      venueCount: sql<number>`COUNT(DISTINCT ${venues.id})`.mapWith(Number),
    })
    .from(venues)
    .innerJoin(addresses, eq(venues.addressId, addresses.id))
    .innerJoin(cities, eq(addresses.cityId, cities.id))
    .where(and(...filters))
    .groupBy(cities.zip)
    .orderBy(desc(sql`COUNT(DISTINCT ${venues.id})`), asc(cities.zip));

  return rows.flatMap((row) => (row.zip ? [{ zip: row.zip, venueCount: row.venueCount }] : []));
}

export async function getCategoryCityCombinations() {
  const result = await useDrizzle().execute(sql`
    SELECT DISTINCT
      act.slug AS activity_slug,
      slugify(c.name) AS city_slug
    FROM venues cl
    JOIN addresses a ON a.id = cl.address_id
    JOIN cities c ON c.id = a.city_id
    JOIN venue_activities ca ON ca.venue_id = cl.id
    JOIN activities act ON act.id = ca.activity_id
    WHERE cl.status = 'active'
      AND c.slug IS NOT NULL
      AND act.slug IS NOT NULL
    ORDER BY 1, 2
  `);
  return (result as { rows: Array<{ activity_slug: string; city_slug: string }> }).rows;
}
