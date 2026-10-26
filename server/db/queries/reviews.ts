import { desc, eq, gte, inArray, sql } from "drizzle-orm";
import { venues, reviews, userVenues } from "~~/server/db/schemas";
import { useDrizzle } from "~~/server/utils/drizzle";

/**
 * Get paginated reviews for a venue (single query + window count).
 */
export async function getVenueReviews(venueId: number, page: number = 1, pageSize: number = 20) {
  const offset = (page - 1) * pageSize;

  const rows = await useDrizzle()
    .select({
      id: reviews.id,
      venueId: reviews.venueId,
      rating: reviews.rating,
      comment: reviews.comment,
      reviewerName: reviews.reviewerName,
      createdAt: reviews.createdAt,
      totalCount: sql<number>`count(*) over()`.mapWith(Number).as("total_count"),
    })
    .from(reviews)
    .where(eq(reviews.venueId, venueId))
    .orderBy(desc(reviews.createdAt))
    .limit(pageSize)
    .offset(offset);

  const totalCount = rows[0]?.totalCount ?? 0;
  const data = rows.map(({ totalCount: _total, ...review }) => review);

  return {
    data,
    meta: {
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

/**
 * Get average rating for a venue
 */
export async function getVenueAverageRating(venueId: number): Promise<number> {
  const result = await useDrizzle()
    .select({
      avg: sql<number>`COALESCE(avg(${reviews.rating}), 0)::numeric(10,2)`,
    })
    .from(reviews)
    .where(eq(reviews.venueId, venueId));

  return Number(result[0]?.avg ?? 0);
}

/**
 * Get review count for a venue
 */
export async function getVenueReviewCount(venueId: number): Promise<number> {
  const result = await useDrizzle()
    .select({ count: sql<number>`count(*)::int` })
    .from(reviews)
    .where(eq(reviews.venueId, venueId));

  return result[0]?.count ?? 0;
}

/**
 * Get all reviews for venues belonging to a franchise
 */
export async function getFranchiseReviews(franchiseId: number) {
  return useDrizzle()
    .select({
      id: reviews.id,
      venueId: reviews.venueId,
      venueName: venues.name,
      rating: reviews.rating,
      comment: reviews.comment,
      reviewerName: reviews.reviewerName,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .innerJoin(venues, eq(reviews.venueId, venues.id))
    .where(eq(venues.franchiseId, franchiseId))
    .orderBy(desc(reviews.createdAt));
}

/**
 * Get average rating across all venues in a franchise
 */
export async function getFranchiseAverageRating(franchiseId: number): Promise<number> {
  const result = await useDrizzle()
    .select({
      avg: sql<number>`COALESCE(avg(${reviews.rating}), 0)::numeric(10,2)`,
    })
    .from(reviews)
    .innerJoin(venues, eq(reviews.venueId, venues.id))
    .where(eq(venues.franchiseId, franchiseId));

  return Number(result[0]?.avg ?? 0);
}

/**
 * Get monthly review counts for the last N months (chart data)
 */
export async function getReviewsOverTime(
  months: number = 12,
): Promise<Array<{ month: string; count: number }>> {
  const result = await useDrizzle()
    .select({
      month: sql<string>`to_char(${reviews.createdAt}, 'YYYY-MM')`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(gte(reviews.createdAt, sql`now() - interval '${sql.raw(String(months))} months'`))
    .groupBy(sql`to_char(${reviews.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${reviews.createdAt}, 'YYYY-MM')`);

  return result;
}

/** Reviews for all venues owned by a user (dashboard). */
export async function getOwnerVenueReviews(userId: string) {
  const userVenueRows = await useDrizzle()
    .select({ venueId: userVenues.venueId })
    .from(userVenues)
    .where(eq(userVenues.userId, userId));

  const venueIds = userVenueRows.map((r) => r.venueId).filter((id): id is number => id !== null);

  if (venueIds.length === 0) return [];

  return useDrizzle()
    .select({
      id: reviews.id,
      venueId: reviews.venueId,
      venueName: venues.name,
      rating: reviews.rating,
      comment: reviews.comment,
      reviewerName: reviews.reviewerName,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .innerJoin(venues, eq(reviews.venueId, venues.id))
    .where(inArray(venues.id, venueIds))
    .orderBy(desc(reviews.createdAt));
}
