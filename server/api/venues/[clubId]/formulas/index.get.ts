import { getVenueFormulas } from "~~/server/db/queries/formulas"

export default defineEventHandler(async (event) => {
  const venueId = getRouterParam(event, "venueId")

  if (!venueId) {
    throw createError({ statusCode: 400, statusMessage: "Venue ID is required" })
  }

  const formulas = await getVenueFormulas(Number(venueId))

  return { data: formulas }
})
