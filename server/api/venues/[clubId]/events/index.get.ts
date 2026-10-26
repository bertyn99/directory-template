import { getVenueEvents } from "~~/server/db/queries/events"

export default defineEventHandler(async (event) => {
  const venueId = getRouterParam(event, "venueId")

  if (!venueId) {
    throw createError({ statusCode: 400, statusMessage: "Venue ID is required" })
  }

  const events = await getVenueEvents(parseInt(venueId))

  return { data: events }
})
