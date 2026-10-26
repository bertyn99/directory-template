import { z } from "zod"
import { updateEvent } from "~~/server/db/queries/events"
import { editVenue } from "~~/shared/utils/abilities"

const updateEventSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  startDate: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  endDate: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  location: z.record(z.string(), z.unknown()).optional(),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  const venueId = getRouterParam(event, "venueId")
  const id = getRouterParam(event, "id")
  if (!venueId || !id) {
    throw createError({ statusCode: 400, statusMessage: "Venue ID and Event ID are required" })
  }

  const parsedVenueId = parseInt(venueId)
  const parsedId = parseInt(id)
  const body = await readValidatedBody(event, (data) => updateEventSchema.parse(data))

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

  const updated = await updateEvent(parsedId, parsedVenueId, body)

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: "Event not found" })
  }

  return { data: updated }
})
