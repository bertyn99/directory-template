import { getAllEquipments } from "~~/server/db/queries/venueRelations"

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const equipments = await getAllEquipments()

  return { data: equipments }
})
