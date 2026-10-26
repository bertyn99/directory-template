import { z } from "zod"
import { createEvent } from "~~/server/db/queries/events"
import { editVenue } from "~~/shared/utils/abilities"

const createEventSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  startDate: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  endDate: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  location: z.record(z.string(), z.unknown()).optional(),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  const venueId = getRouterParam(event, "venueId")
  if (!venueId) {
    throw createError({ statusCode: 400, statusMessage: "Venue ID is required" })
  }

  const parsedVenueId = parseInt(venueId)
  const body = await readValidatedBody(event, (data) => createEventSchema.parse(data))

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

  // Check franchise ownership: user owns franchise → venue belongs to that franchise
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

  const created = await createEvent({
    ...body,
    venueId: parsedVenueId,
  })

  if (!created) {
    throw createError({ statusCode: 500, statusMessage: "Failed to create event" })
  }

  return { data: created }
})
