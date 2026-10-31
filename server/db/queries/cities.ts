import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import {
  activities,
  addresses,
  cities,
  venueActivities,
  venues,
  countries,
} from "~~/server/db/schemas";
import { useDrizzle } from "~~/server/utils/drizzle";
import { majorEuCitySlugAliases } from "~~/shared/major-eu-cities";

/**
 * Match a hub URL's plain name slug against stored city slugs, which are
 * either exact (zip-less towns: 'mere') or name-zip suffixed ('paris-75001').
 */
function citySlugMatches(cityNameSlug: string) {
  return or(
    sql`${cities.slug} = slugify(${cityNameSlug})`,
    sql`${cities.slug} LIKE slugify(${cityNameSlug}) || '-%'`,
  );
}


// ── Return type interfaces ──────────────────────────────────────────────

export interface CityHubData {
  city: { name: string; slug: string };
  country: { name: string; code: string; slug: string };
  totalVenues: number;
  activities: Array<{
    id: number;
    name: string;
    slug: string;
    venueCount: number;
  }>;
  topVenues: Array<{
    id: number;
    name: string;
    slug: string;
    rating: { google: number; count: number } | null;
    searchPicture: string | null;
    activities: Array<{ name: string; slug: string }>;
  }>;
}

/**
 * Match a public city slug from URLs like `/categories/yoga/paris`.
 * City rows are stored per zip (`paris-75001`), so a name slug must
 * include every arrondissement, while a zip slug stays exact.
 */
export function matchCityPublicSlug(citySlug: string) {
  const nameSlugs = majorEuCitySlugAliases(citySlug);
  return or(
    eq(cities.slug, citySlug),
    sql`slugify(${cities.name}) IN (${sql.join(
      nameSlugs.map((slug) => sql`slugify(${slug})`),
      sql`, `,
    )})`,
  );
}

// ── Query functions ─────────────────────────────────────────────────────

export interface AddressGeocodeRow {
  id: number;
  street1: string;
  zip: string | null;
  city: string;
  country: string | null;
  cityLat: number | null;
  cityLng: number | null;
}

/**
 * Addresses of active venues for the geocode backfill.
 * Without `force`, only rows missing coordinates are returned.
 */
export async function getActiveVenueAddressesForGeocode(
  limit: number,
  force = false,
): Promise<AddressGeocodeRow[]> {
  const coverage = force ? sql`TRUE` : sql`(a.lat IS NULL OR a.lat = '')`;
  const result = await useDrizzle().execute(sql`
    SELECT
      a.id,
      a.street1,
      a.zip,
      c.name AS city,
      co.code AS country,
      c.lat AS city_lat,
      c.lng AS city_lng
    FROM addresses a
    JOIN venues cl ON cl.address_id = a.id
    JOIN cities c ON c.id = a.city_id
    LEFT JOIN countries co ON co.id = c.country_id
    WHERE cl.status = 'active' AND ${coverage}
    ORDER BY a.id
    LIMIT ${limit}
  `);

  return (
    (result as { rows: Array<Record<string, unknown>> }).rows
  ).map((row) => ({
    id: Number(row.id),
    street1: String(row.street1 ?? ""),
    zip: row.zip ? String(row.zip) : null,
    city: String(row.city ?? ""),
    country: row.country ? String(row.country) : null,
    cityLat: row.city_lat == null ? null : Number.parseFloat(String(row.city_lat)),
    cityLng: row.city_lng == null ? null : Number.parseFloat(String(row.city_lng)),
  }));
}

export async function setAddressGeocode(
  addressId: number,
  lat: string,
  lng: string,
): Promise<void> {
  await useDrizzle()
    .execute(sql`UPDATE addresses SET lat = ${lat}, lng = ${lng} WHERE id = ${addressId}`);
}

/**
 * Resolve a public city slug (`paris`, `paris-75011`, `lisboa`) to its
 * country (ISO code + DB name + DB slug) and canonical city name. Used to
 * scope "biggest cities of the current country" sections and by
 * GET /api/cities/resolve to redirect the /categories category×city URLs to
 * the country-first chain shape.
 */
export async function getCountryByCitySlug(
  citySlug: string,
): Promise<{
  code: string;
  name: string;
  slug: string;
  cityName: string;
} | null> {
  const rows = await useDrizzle()
    .select({
      code: countries.code,
      name: countries.name,
      slug: countries.slug,
      cityName: cities.name,
    })
    .from(cities)
    .innerJoin(countries, eq(cities.countryId, countries.id))
    .where(matchCityPublicSlug(citySlug))
    .groupBy(countries.code, countries.name, countries.slug, cities.name)
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Get all data needed for a city hub page.
 * Matches cities across zip-code variants (e.g. paris-75001, paris-75002)
 * via `cities.slug LIKE slugify(cityNameSlug) || '-%'`.
 */
export async function getCityHubData(
  countrySlug: string,
  cityNameSlug: string,
): Promise<CityHubData | null> {
  const db = useDrizzle();

  const locationRows = await db
    .select({
      countryId: countries.id,
      countryName: countries.name,
      countryCode: countries.code,
      countrySlug: countries.slug,
      cityName: cities.name,
    })
    .from(countries)
    .innerJoin(cities, eq(cities.countryId, countries.id))
    .where(
      and(
        eq(countries.slug, countrySlug),
        // Hub URLs use the plain name slug (/country/france/mere); stored slugs
        // are either exact (zip-less towns) or name-zip suffixed (paris-75001).
        // Match both so plain-name URLs resolve for every city family.
        citySlugMatches(cityNameSlug),
      ),
    )
    .groupBy(countries.id, countries.name, countries.code, countries.slug, cities.name)
    .limit(1);

  const location = locationRows[0];
  if (!location?.cityName) return null;

  const cityMatcher = and(
    eq(cities.countryId, location.countryId),
    citySlugMatches(cityNameSlug),
    eq(venues.statusCode, "active"),
  );

  const [totalResult, activitiesResult, topVenuesRaw] = await Promise.all([
    db
      .select({
        count: sql<number>`COUNT(DISTINCT ${venues.id})`.mapWith(Number),
      })
      .from(venues)
      .innerJoin(addresses, eq(venues.addressId, addresses.id))
      .innerJoin(cities, eq(addresses.cityId, cities.id))
      .where(cityMatcher),
    db
      .select({
        id: activities.id,
        name: activities.name,
        slug: activities.slug,
        venueCount: sql<number>`COUNT(DISTINCT ${venues.id})`.mapWith(Number),
      })
      .from(activities)
      .innerJoin(venueActivities, eq(activities.id, venueActivities.activityId))
      .innerJoin(venues, eq(venueActivities.venueId, venues.id))
      .innerJoin(addresses, eq(venues.addressId, addresses.id))
      .innerJoin(cities, eq(addresses.cityId, cities.id))
      .where(cityMatcher)
      .groupBy(activities.id, activities.name, activities.slug)
      .orderBy(desc(sql`COUNT(DISTINCT ${venues.id})`), asc(activities.name)),
    db
      .select({
        id: venues.id,
        name: venues.name,
        slug: venues.slug,
        rating: venues.rating,
        searchPicture: venues.searchPicture,
        cityName: cities.name,
        countryCode: countries.code,
      })
      .from(venues)
      .innerJoin(addresses, eq(venues.addressId, addresses.id))
      .innerJoin(cities, eq(addresses.cityId, cities.id))
      .innerJoin(countries, eq(cities.countryId, countries.id))
      .where(cityMatcher)
      .orderBy(sql`(${venues.rating}->>'google')::numeric DESC NULLS LAST`)
      .limit(6),
  ]);

  const totalVenues = totalResult[0]?.count ?? 0;
  const venueIds = topVenuesRaw.map((c) => c.id);
  const activitiesByVenue = new Map<
    number,
    Array<{ name: string; slug: string }>
  >();

  if (venueIds.length > 0) {
    const activitiesRaw = await db
      .select({
        venueId: venueActivities.venueId,
        name: activities.name,
        slug: activities.slug,
      })
      .from(venueActivities)
      .innerJoin(activities, eq(venueActivities.activityId, activities.id))
      .where(inArray(venueActivities.venueId, venueIds))
      .orderBy(asc(activities.name));

    for (const row of activitiesRaw) {
      const list = activitiesByVenue.get(row.venueId) ?? [];
      list.push({ name: row.name, slug: row.slug });
      activitiesByVenue.set(row.venueId, list);
    }
  }

  return {
    city: {
      name: location.cityName,
      slug: cityNameSlug,
    },
    country: {
      name: location.countryName,
      code: location.countryCode ?? "",
      slug: location.countrySlug ?? "",
    },
    totalVenues,
    activities: activitiesResult,
    topVenues: topVenuesRaw.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug ?? "",
      rating: c.rating as { google: number; count: number } | null,
      searchPicture: c.searchPicture,
      activities: activitiesByVenue.get(c.id) ?? [],
      address: {
        city: { name: c.cityName },
        country: { code: c.countryCode ?? "" },
      },
    })),
  };
}

/**
 * Find nearby cities with venues in the same country, excluding the current city.
 */
export async function getNearbyCitiesWithVenues(
  cityName: string,
  countrySlug: string,
  limit = 6,
): Promise<Array<{ name: string; slug: string; venueCount: number }>> {
  const db = useDrizzle();

  // Find country first
  const countryRows = await db
    .select({ id: countries.id })
    .from(countries)
    .where(eq(countries.slug, countrySlug))
    .limit(1);

  if (!countryRows[0]) return [];

  const result = await db
    .select({
      name: cities.name,
      slug: sql<string>`slugify(${cities.name})`.as("slug"),
      venueCount: sql<number>`COUNT(DISTINCT ${venues.id})`.mapWith(Number),
    })
    .from(cities)
    .innerJoin(addresses, eq(cities.id, addresses.cityId))
    .innerJoin(venues, eq(addresses.id, venues.addressId))
    .where(
      and(
        eq(cities.countryId, countryRows[0].id),
        sql`${cities.name} != ${cityName}`,
        eq(venues.statusCode, 'active'),
      ),
    )
    .groupBy(cities.name)
    .having(sql`COUNT(DISTINCT ${venues.id}) > 0`)
    .orderBy(desc(sql`COUNT(DISTINCT ${venues.id})`), asc(cities.name))
    .limit(limit);

  return result;
}

/**
 * Return all country/city slug pairs for cities that have at least 1 venue.
 * Used by the sitemap.
 */
export async function getCityHubSlugs(): Promise<
  Array<{ countrySlug: string; cityNameSlug: string }>
> {
  const db = useDrizzle();

  const result = await db
    .select({
      countrySlug: countries.slug,
      cityNameSlug: sql<string>`slugify(MIN(${cities.name}))`.as("city_slug"),
    })
    .from(cities)
    .innerJoin(countries, eq(cities.countryId, countries.id))
    .innerJoin(addresses, eq(cities.id, addresses.cityId))
    .innerJoin(venues, eq(addresses.id, venues.addressId))
    .where(eq(venues.statusCode, "active"))
    .groupBy(countries.slug, cities.name)
    .having(sql`COUNT(DISTINCT ${venues.id}) > 0`)
    .orderBy(asc(countries.slug), asc(sql`city_slug`));

  return result.map((r) => ({
    countrySlug: r.countrySlug ?? "",
    cityNameSlug: r.cityNameSlug,
  }));
}

/**
 * Return top N cities by venue count per country.
 * Uses a window function to rank cities within each country.
 */
export async function getTopCitiesPerCountry(
  limit = 10,
): Promise<
  Array<{ countrySlug: string; cityNameSlug: string; venueCount: number }>
> {
  const db = useDrizzle();

  const result = await db.execute(sql`
    WITH ranked_cities AS (
      SELECT
        ${countries.slug} AS country_slug,
        slugify(${cities.name}) AS city_slug,
        COUNT(DISTINCT ${venues.id}) AS venue_count,
        ROW_NUMBER() OVER (PARTITION BY ${countries.slug} ORDER BY COUNT(DISTINCT ${venues.id}) DESC) AS row_num
      FROM ${cities}
      INNER JOIN ${countries} ON ${cities.countryId} = ${countries.id}
      INNER JOIN ${addresses} ON ${cities.id} = ${addresses.cityId}
      INNER JOIN ${venues} ON ${addresses.id} = ${venues.addressId}
      WHERE ${venues.statusCode} = 'active'
      GROUP BY ${countries.slug}, ${cities.name}
      HAVING COUNT(DISTINCT ${venues.id}) > 0
    )
    SELECT country_slug, city_slug, venue_count
    FROM ranked_cities
    WHERE row_num <= ${limit}
    ORDER BY country_slug, venue_count DESC
  `);

  return result.rows.map((r) => ({
    countrySlug: r.country_slug as string,
    cityNameSlug: r.city_slug as string,
    venueCount: Number(r.venue_count),
  }));
}

/** City autocomplete / search. */
export async function searchCities(options?: { search?: string; limit?: number }) {
  const { search, limit } = options ?? {};
  let query = useDrizzle()
    .select({ id: cities.id, name: cities.name, slug: cities.slug })
    .from(cities);

  if (search) {
    const sanitized = search.replace(/[%_]/g, "\\$&");
    query = query.where(ilike(cities.name, `%${sanitized}%`));
  }

  if (limit) {
    const parsed = Math.min(limit, 100);
    if (parsed > 0) query = query.limit(parsed);
  }

  return await query;
}

/** Activities with venue counts for a given city slug. */
export async function getActivitiesByCitySlug(citySlug: string) {
  return useDrizzle()
    .select({
      id: activities.id,
      name: activities.name,
      slug: activities.slug,
      venueCount: sql<number>`count(DISTINCT ${venues.id})`.as("venueCount"),
    })
    .from(cities)
    .innerJoin(addresses, eq(addresses.cityId, cities.id))
    .innerJoin(
      venues,
      and(eq(venues.addressId, addresses.id), eq(venues.statusCode, "active")),
    )
    .innerJoin(venueActivities, eq(venueActivities.venueId, venues.id))
    .innerJoin(activities, eq(activities.id, venueActivities.activityId))
    .where(eq(cities.slug, citySlug))
    .groupBy(activities.id, activities.name, activities.slug)
    .having(sql`count(DISTINCT ${venues.id}) > 0`);
}
