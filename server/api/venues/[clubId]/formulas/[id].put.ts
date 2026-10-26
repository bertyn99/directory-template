import { z } from "zod"
import { updateFormula } from "~~/server/db/queries/formulas"
import { editVenue } from "~~/shared/utils/abilities"

const updateFormulaSchema = z.object({
  type: z.string().min(1, "Type is required").optional(),
  name: z.string().min(1, "Name is required").optional(),
  infos: z.string().optional(),
  price: z.string().min(1, "Price is required").optional(),
})

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

  // Validate body
  const body = await readValidatedBody(event, updateFormulaSchema.parse)

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

  // Update the formula (scoped to venueId)
  const updated = await updateFormula(numericId, numericVenueId, body)

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: "Formula not found" })
  }

  return { data: updated }
})
