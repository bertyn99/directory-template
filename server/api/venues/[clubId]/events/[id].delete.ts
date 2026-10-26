import { deleteEvent } from "~~/server/db/queries/events"
import { editVenue } from "~~/shared/utils/abilities"

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  const venueId = getRouterParam(event, "venueId")
  const id = getRouterParam(event, "id")
  if (!venueId || !id) {
    throw createError({ statusCode: 400, statusMessage: "Venue ID and Event ID are required" })
  }

  const parsedVenueId = parseInt(venueId)
  const parsedId = parseInt(id)

  const db = useDrizzle()

  // Check direct ownership via userVenues
  const ownership = await db.query.userVenues.findFirst({
    where: {
      AND: [
        { userId: session.user.id },
        { venueId: parsedVenueId },
      ],
    },
  })
  const isOwner = !!ownership

  // Check franchise ownership
  let isFranchiseOwner = false
  if (!isOwner) {
    const venue = await db.query.venues.findFirst({
      where: { id: parsedVenueId },
      columns: { franchiseId: true },
    })
    if (venue?.franchiseId) {
      const franchise = await db.query.franchises.findFirst({
        where: {
          AND: [
            { id: venue.franchiseId },
            { ownerId: session.user.id },
          ],
        },
      })
      isFranchiseOwner = !!franchise
    }
  }

  await authorize(event, editVenue, isOwner, isFranchiseOwner)

  const deleted = await deleteEvent(parsedId, parsedVenueId)

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: "Event not found" })
  }

  return { data: deleted }
})
