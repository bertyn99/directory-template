import { count, eq, sql } from "drizzle-orm";
import { activities, addresses, cities, venues } from "~~/server/db/schemas";
import { useDrizzle } from "~~/server/utils/drizzle";

export interface SiteStats {
  venues: number;
  cities: number;
  countries: number;
  categories: number;
}

/**
 * Site-wide counts for the About page: total venues, cities with at least one
 * venue, countries with at least one venue, and listed categories.
 */
export async function getSiteStats(): Promise<SiteStats> {
  const db = useDrizzle();

  const [venueRow] = await db.select({ value: count() }).from(venues);
  const [cityRow] = await db
    .select({ value: count(sql`DISTINCT ${addresses.cityId}`) })
    .from(addresses)
    .innerJoin(venues, eq(venues.addressId, addresses.id));
  const [countryRow] = await db
    .select({ value: count(sql`DISTINCT ${cities.countryId}`) })
    .from(cities)
    .innerJoin(addresses, eq(addresses.cityId, cities.id))
    .innerJoin(venues, eq(venues.addressId, addresses.id));
  const [categoryRow] = await db.select({ value: count() }).from(activities);

  return {
    venues: venueRow?.value ?? 0,
    cities: cityRow?.value ?? 0,
    countries: countryRow?.value ?? 0,
    categories: categoryRow?.value ?? 0,
  };
}
