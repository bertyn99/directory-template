/**
 * Scraper yield and spike alert monitoring.
 *
 * Tracks per-source scrape yields against a 7-day moving average and detects
 * hourly spikes in new venue creation. All metrics are stored in Redis via
 * Nitro's useStorage('redis') with appropriate TTLs.
 *
 * Alert failures never block the scraper — all operations are fire-and-forget.
 */

const YIELD_KEY_PREFIX = 'monitor:yield'
const SPIKE_KEY = 'monitor:spike:new-venues'

/** 7 days in seconds */
const YIELD_TTL_SECONDS = 7 * 24 * 60 * 60
/** 1 hour in seconds */
const SPIKE_TTL_SECONDS = 60 * 60

/** Spike threshold: alert if > this many new venues per hour */
const SPIKE_THRESHOLD = 500
/** Yield alert threshold: warn if current run < 80% of 7-day average */
const YIELD_MIN_RATIO = 0.8

export interface YieldRecord {
  timestamp: string
  itemsScraped: number
}

export interface YieldAlert {
  sourceCode: string
  currentItems: number
  averageItems: number
  ratio: number
}

export interface SpikeAlert {
  currentCount: number
  threshold: number
}

export interface ScraperMetrics {
  yields: Record<string, {
    current: YieldRecord | null
    average: number
    runCount: number
  }>
  spike: {
    hourlyCount: number
    threshold: number
  }
}

/**
 * Record a scraper run's yield for a given source.
 * Stores the run in a Redis list capped at 100 entries, with a 7-day TTL.
 */
export async function recordScraperRun(
  sourceCode: string,
  itemsScraped: number,
): Promise<void> {
  try {
    const storage = useStorage('redis')
    const key = `${YIELD_KEY_PREFIX}:${sourceCode}`
    const record: YieldRecord = {
      timestamp: new Date().toISOString(),
      itemsScraped,
    }

    const existing = await storage.getItem<YieldRecord[]>(key) ?? []

    // Append and cap at 100 entries
    existing.push(record)
    const capped = existing.slice(-100)

    await storage.setItem(key, capped, { ttl: YIELD_TTL_SECONDS })
  }
  catch (error) {
    console.warn(`[scraper-alerts] Redis unavailable for recordScraperRun(${sourceCode}):`, error)
  }
}

/**
 * Check whether a scraper run's yield is below 80% of the 7-day moving average.
 * Logs a warning if the yield is anomalously low.
 *
 * @returns The alert details if triggered, or null if yield is normal
 */
export async function checkScraperYield(
  sourceCode: string,
  itemsScraped: number,
): Promise<YieldAlert | null> {
  try {
    const storage = useStorage('redis')
    const key = `${YIELD_KEY_PREFIX}:${sourceCode}`
    const records = await storage.getItem<YieldRecord[]>(key) ?? []

    // Need at least 3 historical runs to establish a meaningful average
    if (records.length < 3) {
      return null
    }

    // Filter to last 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const recent = records.filter(
      r => new Date(r.timestamp).getTime() > sevenDaysAgo,
    )

    if (recent.length < 3) {
      return null
    }

    const average = recent.reduce((sum, r) => sum + r.itemsScraped, 0) / recent.length
    const ratio = itemsScraped / average

    if (ratio < YIELD_MIN_RATIO) {
      const alert: YieldAlert = {
        sourceCode,
        currentItems: itemsScraped,
        averageItems: Math.round(average * 100) / 100,
        ratio: Math.round(ratio * 1000) / 1000,
      }

      console.warn(
        `[scraper-alerts] LOW YIELD for "${sourceCode}": ${itemsScraped} items scraped `
        + `(avg: ${alert.averageItems}, ratio: ${ratio.toFixed(2)}). `
        + `Threshold: ${YIELD_MIN_RATIO * 100}%`,
      )

      return alert
    }

    return null
  }
  catch (error) {
    console.warn(`[scraper-alerts] Redis unavailable for checkScraperYield(${sourceCode}):`, error)
    return null
  }
}

/**
 * Track new venue creation rate and alert if it exceeds the hourly threshold.
 * Increments a Redis counter with 1-hour TTL.
 *
 * @returns The spike alert details if triggered, or null if rate is normal
 */
export async function checkNewVenueSpike(
  newVenuesCount: number,
): Promise<SpikeAlert | null> {
  try {
    const storage = useStorage('redis')
    const current = await storage.getItem<number>(SPIKE_KEY) ?? 0
    const updated = current + newVenuesCount

    await storage.setItem(SPIKE_KEY, updated, { ttl: SPIKE_TTL_SECONDS })

    if (updated > SPIKE_THRESHOLD) {
      const alert: SpikeAlert = {
        currentCount: updated,
        threshold: SPIKE_THRESHOLD,
      }

      console.warn(
        `[scraper-alerts] NEW VENUE SPIKE: ${updated} venues in the last hour `
        + `(threshold: ${SPIKE_THRESHOLD}). Investigate for anomalies.`,
      )

      return alert
    }

    return null
  }
  catch (error) {
    console.warn('[scraper-alerts] Redis unavailable for checkNewVenueSpike:', error)
    return null
  }
}

/**
 * Retrieve current scraper metrics for the admin dashboard.
 */
export async function getScraperMetrics(): Promise<ScraperMetrics> {
  const storage = useStorage('redis')
  const metrics: ScraperMetrics = {
    yields: {},
    spike: {
      hourlyCount: 0,
      threshold: SPIKE_THRESHOLD,
    },
  }

  try {
    // Get spike count
    metrics.spike.hourlyCount = await storage.getItem<number>(SPIKE_KEY) ?? 0

    // Get yield data for known sources by scanning keys
    // We use a known set of source codes from the registry
    const sourceCodes = await getKnownSourceCodes()

    for (const code of sourceCodes) {
      const key = `${YIELD_KEY_PREFIX}:${code}`
      const records = await storage.getItem<YieldRecord[]>(key) ?? []

      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      const recent = records.filter(
        r => new Date(r.timestamp).getTime() > sevenDaysAgo,
      )

      const current = records.length > 0 ? records[records.length - 1] : null
      const average = recent.length > 0
        ? recent.reduce((sum, r) => sum + r.itemsScraped, 0) / recent.length
        : 0

      metrics.yields[code] = {
        current,
        average: Math.round(average * 100) / 100,
        runCount: recent.length,
      }
    }
  }
  catch (error) {
    console.warn('[scraper-alerts] Redis unavailable for getScraperMetrics:', error)
  }

  return metrics
}

/**
 * Get the list of source codes that have yield data in Redis.
 * Falls back to an empty array if Redis is unavailable.
 */
async function getKnownSourceCodes(): Promise<string[]> {
  try {
    const storage = useStorage('redis')
    const keys = await storage.getKeys(`${YIELD_KEY_PREFIX}:`)
    return keys.map(k => k.replace(`${YIELD_KEY_PREFIX}:`, ''))
  }
  catch {
    return []
  }
}
