import { getVenueImages } from "~~/server/db/queries/images"

export default defineEventHandler(async (event) => {
  const venueId = getRouterParam(event, "venueId")

  if (!venueId) {
    throw createError({ statusCode: 400, statusMessage: "Venue ID is required" })
  }

  const images = await getVenueImages(Number(venueId))

  return { data: images }
})
