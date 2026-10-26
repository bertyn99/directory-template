import {
  activities,
  cities,
  venues,
  countries,
  franchises,
  subscriptions,
  userVenues,
  users,
} from "~~/server/db/schemas";
import { useDrizzle } from "~~/server/utils/drizzle";
import { getCityHubSlugs } from "./cities";

export interface BenchSamples {
  venueId: number | null;
  venueSlug: string | null;
  activitySlug: string | null;
  citySlug: string | null;
  cityHub: { countrySlug: string; cityNameSlug: string } | null;
  countrySlug: string | null;
  franchiseId: number | null;
  userId: string | null;
  userEmail: string | null;
  username: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

let cached: BenchSamples | null = null;

/** Resolve representative IDs from live DB — cached for one bench run. */
export async function getBenchSamples(): Promise<BenchSamples> {
  if (cached) return cached;

  const db = useDrizzle();

  const [venueRow, activityRow, cityRow, countryRow, franchiseRow, userRow, subRow, ownerRow] =
    await Promise.all([
      db.select({ id: venues.id, slug: venues.slug }).from(venues).limit(1).then((r) => r[0]),
      db.select({ slug: activities.slug }).from(activities).limit(1).then((r) => r[0]),
      db.select({ slug: cities.slug }).from(cities).limit(1).then((r) => r[0]),
      db.select({ slug: countries.slug }).from(countries).limit(1).then((r) => r[0]),
      db.select({ id: franchises.id }).from(franchises).limit(1).then((r) => r[0]),
      db.select({ id: users.id, email: users.email, username: users.username, stripeCustomerId: users.stripeCustomerId }).from(users).limit(1).then((r) => r[0]),
      db
        .select({ stripeSubscriptionId: subscriptions.stripeSubscriptionId })
        .from(subscriptions)
        .limit(1)
        .then((r) => r[0]),
      db
        .select({ userId: userVenues.userId })
        .from(userVenues)
        .limit(1)
        .then((r) => r[0]),
    ]);

  const hubSlugs = await getCityHubSlugs();

  cached = {
    venueId: venueRow?.id ?? null,
    venueSlug: venueRow?.slug ?? null,
    activitySlug: activityRow?.slug ?? null,
    citySlug: cityRow?.slug ?? null,
    cityHub: hubSlugs[0] ?? null,
    countrySlug: countryRow?.slug ?? hubSlugs[0]?.countrySlug ?? null,
    franchiseId: franchiseRow?.id ?? null,
    userId: ownerRow?.userId ?? userRow?.id ?? null,
    userEmail: userRow?.email ?? null,
    username: userRow?.username ?? null,
    stripeCustomerId: userRow?.stripeCustomerId ?? null,
    stripeSubscriptionId: subRow?.stripeSubscriptionId ?? null,
  };

  return cached;
}

export function resetBenchSamples(): void {
  cached = null;
}

export function hasSample(
  samples: BenchSamples,
  key: keyof BenchSamples,
): boolean {
  return samples[key] != null;
}
