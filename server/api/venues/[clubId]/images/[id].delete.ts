import { deleteImage } from "~~/server/db/queries/images"
import { editVenue } from "~~/shared/utils/abilities"

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const venueId = getRouterParam(event, "venueId")
  const imageId = getRouterParam(event, "id")

  if (!venueId) {
    throw createError({ statusCode: 400, statusMessage: "Venue ID is required" })
  }

  if (!imageId) {
    throw createError({ statusCode: 400, statusMessage: "Image ID is required" })
  }

  const numericVenueId = Number(venueId)
  const numericImageId = Number(imageId)

  // Check ownership via userVenues junction table
  const db = useDrizzle()
  const ownership = await db.query.userVenues.findFirst({
    where: {
      AND: [
        { userId: session.user.id },
        { venueId: numericVenueId },
      ],
    },
  })

  const isOwner = !!ownership
  await authorize(event, editVenue, isOwner)

  // Delete the image (scoped to venueId)
  const deleted = await deleteImage(numericImageId, numericVenueId)

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: "Image not found" })
  }

  return { data: deleted }
})
