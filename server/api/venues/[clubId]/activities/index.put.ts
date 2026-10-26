import { z } from "zod"
import { editVenue } from "~~/shared/utils/abilities"
import { setVenueActivities } from "~~/server/db/queries/venueRelations"

const bodySchema = z.object({
  activityIds: z.array(z.number().int().positive()),
})

export default defineEventHandler(async (event) => {
  try {
    const session = await requireUserSession(event)
    const venueId = getRouterParam(event, "venueId")

    if (!venueId) {
      throw createError({ statusCode: 400, statusMessage: "Venue ID is required" })
    }

    const { activityIds } = await readValidatedBody(event, bodySchema.parse)

    const db = useDrizzle()

    // Verify venue exists
    const venue = await db.query.venues.findFirst({
      where: { id: Number(venueId) },
    })

    if (!venue) {
      throw createError({ statusCode: 404, statusMessage: "Venue not found" })
    }

    // Verify ownership via userVenues junction table
    const ownership = await db.query.userVenues.findFirst({
      where: {
        AND: [
          { userId: session.user.id },
          { venueId: venue.id },
        ],
      },
    })

    const isOwner = !!ownership
    await authorize(event, editVenue, isOwner)

    await setVenueActivities(venue.id, activityIds)

    return { data: { success: true } }
  } catch (err: unknown) {
    // Re-throw H3Errors as-is
    if (err && typeof err === "object" && "statusCode" in err) {
      throw err
    }

    console.error(err)
    throw createError({
      statusCode: 500,
      statusMessage: err instanceof Error ? err.message : "Failed to update activities",
    })
  }
})
