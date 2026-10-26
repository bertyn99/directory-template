import { z } from "zod"
import { addImage, setVenueSearchPicture } from "~~/server/db/queries/images"
import { editVenue } from "~~/shared/utils/abilities"

const addImageSchema = z.object({
  url: z.string().url({ message: "Invalid image URL" }),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const venueId = getRouterParam(event, "venueId")

  if (!venueId) {
    throw createError({ statusCode: 400, statusMessage: "Venue ID is required" })
  }

  const numericVenueId = Number(venueId)

  // Validate body
  const body = await readValidatedBody(event, addImageSchema.parse)

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

  // Add the image
  const image = await addImage(numericVenueId, body.url)

  // If venue has no searchPicture, set this image as the search picture
  const venue = await db.query.venues.findFirst({
    where: { id: numericVenueId },
    columns: { searchPicture: true },
  })

  if (venue && !venue.searchPicture) {
    await setVenueSearchPicture(numericVenueId, body.url)
  }

  return { data: image }
})
