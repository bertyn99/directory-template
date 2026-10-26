import { and, count, eq, inArray, sql } from "drizzle-orm";
import { venues, events, reviews, userVenues } from "~~/server/db/schemas";
import { useDrizzle } from "~~/server/utils/drizzle";

export interface OwnerVenueStats {
  totalVenues: number;
  activeVenues: number;
  avgRating: number;
  totalReviews: number;
  upcomingEvents: number;
  reviewsOverTime: Array<{ month: string; count: number }>;
}

const emptyStats: OwnerVenueStats = {
  totalVenues: 0,
  activeVenues: 0,
  avgRating: 0,
  totalReviews: 0,
  upcomingEvents: 0,
  reviewsOverTime: [],
};

/**
 * Get aggregated stats for all venues owned by a user (via userVenues).
 */
export async function getOwnerVenueStats(
  userId: string
): Promise<OwnerVenueStats> {
  const db = useDrizzle();

  // Get venue IDs for this owner
  const ownerRows = await db
    .select({ venueId: userVenues.venueId })
    .from(userVenues)
    .where(eq(userVenues.userId, userId));

  const venueIds = ownerRows.map((r) => r.venueId).filter((id): id is number => id !== null);
  if (venueIds.length === 0) return { ...emptyStats };

  return computeStats(db, venueIds);
}

/**
 * Get aggregated stats for all venues belonging to a franchise.
 */
export async function getFranchiseStats(
  franchiseId: number
): Promise<OwnerVenueStats> {
  const db = useDrizzle();

  // Get venue IDs for this franchise
  const franchiseRows = await db
    .select({ id: venues.id })
    .from(venues)
    .where(eq(venues.franchiseId, franchiseId));

  const venueIds = franchiseRows.map((r) => r.id);
  if (venueIds.length === 0) return { ...emptyStats };

  return computeStats(db, venueIds);
}

// ── Internal ──────────────────────────────────────────────────────────────

async function computeStats(
  db: ReturnType<typeof useDrizzle>,
  venueIds: number[]
): Promise<OwnerVenueStats> {
  const [venueCounts, reviewAgg, upcomingResult, reviewsTime] =
    await Promise.all([
      // totalVenues + activeVenues
      db
        .select({
          total: count().as("total"),
          active:
            sql<number>`COUNT(*) FILTER (WHERE ${venues.statusCode} = 'active')`
              .mapWith(Number)
              .as("active"),
        })
        .from(venues)
        .where(inArray(venues.id, venueIds))
        .then((r) => r[0] ?? { total: 0, active: 0 }),

      // avgRating + totalReviews
      db
        .select({
          avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`
            .mapWith(Number)
            .as("avg"),
          total: count().as("total"),
        })
        .from(reviews)
        .where(inArray(reviews.venueId, venueIds))
        .then((r) => r[0] ?? { avg: 0, total: 0 }),

      // upcomingEvents
      db
        .select({ count: count() })
        .from(events)
        .where(
          and(inArray(events.venueId, venueIds), sql`${events.startDate} >= NOW()`)
        )
        .then((r) => r[0]?.count ?? 0),

      // reviewsOverTime — last 6 months
      db
        .select({
          month: sql<string>`TO_CHAR(${reviews.createdAt}, 'YYYY-MM')`.as("month"),
          count: sql<number>`COUNT(*)::int`.as("count"),
        })
        .from(reviews)
        .where(
          and(
            inArray(reviews.venueId, venueIds),
            sql`${reviews.createdAt} >= NOW() - INTERVAL '6 months'`
          )
        )
        .groupBy(sql`TO_CHAR(${reviews.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${reviews.createdAt}, 'YYYY-MM')`),
    ]);

  return {
    totalVenues: venueCounts.total,
    activeVenues: venueCounts.active,
    avgRating: Math.round(reviewAgg.avg * 10) / 10,
    totalReviews: reviewAgg.total,
    upcomingEvents: upcomingResult,
    reviewsOverTime: reviewsTime,
  };
}
