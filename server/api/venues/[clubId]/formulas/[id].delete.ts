import { deleteFormula } from "~~/server/db/queries/formulas"
import { editVenue } from "~~/shared/utils/abilities"

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const venueId = getRouterParam(event, "venueId")
  const id = getRouterParam(event, "id")

  if (!venueId) {
    throw createError({ statusCode: 400, statusMessage: "Venue ID is required" })
  }

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Formula ID is required" })
  }

  const numericVenueId = Number(venueId)
  const numericId = Number(id)

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

  // Delete the formula (scoped to venueId)
  const deleted = await deleteFormula(numericId, numericVenueId)

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: "Formula not found" })
  }

  return { data: deleted }
})
