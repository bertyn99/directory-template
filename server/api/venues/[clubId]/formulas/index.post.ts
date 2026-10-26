import { z } from "zod"
import { createFormula } from "~~/server/db/queries/formulas"
import { editVenue } from "~~/shared/utils/abilities"

const createFormulaSchema = z.object({
  type: z.string().min(1, "Type is required"),
  name: z.string().min(1, "Name is required"),
  infos: z.string().optional(),
  price: z.string().min(1, "Price is required"),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const venueId = getRouterParam(event, "venueId")

  if (!venueId) {
    throw createError({ statusCode: 400, statusMessage: "Venue ID is required" })
  }

  const numericVenueId = Number(venueId)

  // Validate body
  const body = await readValidatedBody(event, createFormulaSchema.parse)

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

  // Create the formula
  const formula = await createFormula({
    venueId: numericVenueId,
    type: body.type,
    name: body.name,
    infos: body.infos,
    price: body.price,
  })

  return { data: formula }
})
