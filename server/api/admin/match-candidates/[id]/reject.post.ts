import { useDrizzle } from "#imports";
import { matchCandidates, venueSources, venues } from "~~/server/db/schemas";
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
          addressId: true,
        },
      },
    },
  });

  if (!candidate) {
    throw createError({ statusCode: 404, statusMessage: "Pending match candidate not found" });
  }

  // Reject: create a new canonical venue from the venue_source data
  const [newVenue] = await db
    .insert(venues)
    .values({
      name: candidate.venueSource.name || "Unknown Venue",
      tel: candidate.venueSource.tel || undefined,
      website: candidate.venueSource.website || undefined,
      addressId: candidate.venueSource.addressId || undefined,
      aliases: [],
    })
    .returning({ id: venues.id });

  // Link venue_source to new venue
  await db
    .update(venueSources)
    .set({
      venueId: newVenue.id,
      matchScore: null,
      matchMethod: "manual-reject",
      matchedAt: new Date(),
    })
    .where(eq(venueSources.id, candidate.venueSourceId));

  // Update candidate status
  await db
    .update(matchCandidates)
    .set({
      statusCode: "REJECTED",
      reviewedBy: session.user.id as string,
      reviewedAt: new Date(),
    })
    .where(eq(matchCandidates.id, id));

  return {
    data: {
      candidateId: id,
      action: "rejected",
      venueSourceId: candidate.venueSourceId,
      newVenueId: newVenue.id,
    },
  };
});
