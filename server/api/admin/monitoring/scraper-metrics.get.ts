import { getScraperMetrics } from "~~/server/services/monitoring/scraperAlerts"


export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  await authorize(event, accessAdmin)
  const metrics = await getScraperMetrics()
  return { data: metrics }
})
