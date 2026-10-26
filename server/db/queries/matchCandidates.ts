import { eq, sql } from "drizzle-orm";
import { matchCandidates } from "~~/server/db/schemas";
import { useDrizzle } from "~~/server/utils/drizzle";

export type MatchCandidateStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface GetMatchCandidatesInput {
  status?: MatchCandidateStatus;
  page?: number;
  pageSize?: number;
}

/** Paginated admin list of match candidates with source/venue relations. */
export async function getMatchCandidates(input: GetMatchCandidatesInput = {}) {
  const status = input.status ?? "PENDING";
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));
  const db = useDrizzle();

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(matchCandidates)
    .where(eq(matchCandidates.statusCode, status));

  const candidates = await db.query.matchCandidates.findMany({
    where: { statusCode: status },
    orderBy: { id: "desc" },
    limit: pageSize,
    offset: (page - 1) * pageSize,
    with: {
      venueSource: {
        with: {
          address: {
            with: {
              city: {
                with: { country: true },
              },
            },
          },
        },
      },
      existingVenue: {
        with: {
          address: {
            with: {
              city: {
                with: { country: true },
              },
            },
          },
        },
      },
      reviewer: {
        columns: { id: true, username: true, email: true },
      },
    },
  });

  return {
    data: candidates,
    meta: {
      totalCount: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    },
  };
}

/** Count only — lighter bench for status filter performance. */
export async function countMatchCandidates(
  status: MatchCandidateStatus = "PENDING",
) {
  const [{ count }] = await useDrizzle()
    .select({ count: sql<number>`count(*)::int` })
    .from(matchCandidates)
    .where(eq(matchCandidates.statusCode, status));
  return count;
}
