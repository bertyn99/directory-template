import { useDrizzle } from "#imports";
import { matchCandidates, venueSources } from "~~/server/db/schemas";
import { eq } from "drizzle-orm";
import { accessAdmin } from "~~/shared/utils/abilities"

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  await authorize(event, accessAdmin);
  const db = useDrizzle();

  const id = Number(getRouterParam(event, "id"));
  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid candidate ID" });
  }

  // Fetch the candidate
  const candidate = await db.query.matchCandidates.findFirst({
    where: {
      AND: [
        { id: id },
        { statusCode: "PENDING" },
      ],
    },
    with: {
      venueSource: {
        columns: {
          id: true,
          name: true,
          sourceCode: true,
          locale: true,
          tel: true,
          website: true,
          url: true,
          raw: true,
          addressId: true,
        },
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
        columns: {
          id: true,
          name: true,
          slug: true,
          tel: true,
          website: true,
          addressId: true,
        },
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
    },
  });

  if (!candidate) {
    throw createError({ statusCode: 404, statusMessage: "Pending match candidate not found" });
  }

  // Approve: link venue_source to existing venue
  await db
    .update(venueSources)
    .set({
      venueId: candidate.existingVenueId,
      matchScore: candidate.score,
      matchMethod: "manual",
      matchedAt: new Date(),
    })
    .where(eq(venueSources.id, candidate.venueSourceId));

  // Update candidate status
  await db
    .update(matchCandidates)
    .set({
      statusCode: "APPROVED",
      reviewedBy: session.user.id as string,
      reviewedAt: new Date(),
    })
    .where(eq(matchCandidates.id, id));

  return {
    data: {
      candidateId: id,
      action: "approved",
      venueSourceId: candidate.venueSourceId,
      venueId: candidate.existingVenueId,
    },
  };
});
