import { getVenueActivities } from "~~/server/db/queries/venueRelations"

export default defineEventHandler(async (event) => {
  const venueId = getRouterParam(event, "venueId")

  if (!venueId) {
    throw createError({ statusCode: 400, statusMessage: "Venue ID is required" })
  }

  const activities = await getVenueActivities(Number(venueId))

  return { data: activities }
})
