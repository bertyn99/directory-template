import { and, count, eq, ilike, notInArray, sql } from "drizzle-orm";
import { addresses, cities, venues, countries } from "~~/server/db/schemas";
import { useDrizzle } from "~~/server/utils/drizzle";

/** All countries with city and venue counts (excludes Réunion). */
export async function getCountriesWithCounts() {
  return useDrizzle()
    .select({
      id: countries.id,
      name: countries.name,
      code: countries.code,
      slug: countries.slug,
      cityCount: count(sql`DISTINCT ${cities.id}`),
      totalVenues: count(sql`DISTINCT ${venues.id}`),
    })
    .from(countries)
    .leftJoin(cities, eq(cities.countryId, countries.id))
    .leftJoin(addresses, eq(addresses.cityId, cities.id))
    .leftJoin(venues, eq(venues.addressId, addresses.id))
    .where(notInArray(countries.code, ["RE"]))
    .groupBy(countries.id, countries.name, countries.code, countries.slug)
    .orderBy(countries.name);
}

/** Cities in a country, optionally filtered by name search. */
export async function getCitiesByCountrySlug(
  countrySlug: string,
  options?: { search?: string; limit?: number },
) {
  const { search, limit = 10 } = options ?? {};
  const db = useDrizzle();

  const conditions = [eq(countries.slug, countrySlug)];
  if (search && search !== "") {
    conditions.push(ilike(cities.name, `%${search}%`));
  }

  return db
    .select({
      id: cities.id,
      name: cities.name,
      slug: cities.slug,
    })
    .from(cities)
    .leftJoin(addresses, eq(cities.id, addresses.cityId))
    .leftJoin(countries, eq(cities.countryId, countries.id))
    .where(and(...conditions))
    .groupBy(cities.id, cities.name, cities.slug)
    .limit(limit);
}
