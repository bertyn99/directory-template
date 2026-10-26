import { getAllActivities } from "~~/server/db/queries/venueRelations"

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const activities = await getAllActivities()

  return { data: activities }
})
