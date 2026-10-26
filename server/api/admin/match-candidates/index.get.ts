import { getMatchCandidates } from "~~/server/db/queries/matchCandidates";
import { accessAdmin } from "~~/shared/utils/abilities";

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  await authorize(event, accessAdmin);

  const query = getQuery(event);
  const status = (query.status as string) || "PENDING";
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid status. Must be PENDING, APPROVED, or REJECTED.",
    });
  }

  return getMatchCandidates({
    status: status as "PENDING" | "APPROVED" | "REJECTED",
    page,
    pageSize,
  });
});
