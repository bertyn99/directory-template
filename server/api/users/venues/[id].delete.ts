import { eq, and } from "drizzle-orm";
import { userVenues } from "~~/server/db/schemas";
import { editVenue } from "~~/shared/utils/abilities";

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const idParam = getRouterParam(event, "id");

  if (!idParam) {
    throw createError({ statusCode: 400, statusMessage: "Venue ID is required" });
  }

  const venueId = Number(idParam);
  if (Number.isNaN(venueId)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid Venue ID" });
  }

  const db = useDrizzle();

  // Check direct ownership via userVenues
  const ownership = await db.query.userVenues.findFirst({
    where: { AND: [{ userId: session.user.id }, { venueId: venueId }] },
  });
  const isOwner = !!ownership;

  // Check franchise ownership
  let isFranchiseOwner = false;
  if (!isOwner) {
    const venue = await db.query.venues.findFirst({
      where: { id: venueId },
      columns: { franchiseId: true },
    });
    if (venue?.franchiseId) {
      const franchise = await db.query.franchises.findFirst({
        where: { AND: [{ id: venue.franchiseId }, { ownerId: session.user.id }] },
      });
      isFranchiseOwner = !!franchise;
    }
  }

  await authorize(event, editVenue, isOwner, isFranchiseOwner);

  // Delete the user-venue association
  await db
    .delete(userVenues)
    .where(and(eq(userVenues.userId, session.user.id), eq(userVenues.venueId, venueId)));

  return { success: true };
});
