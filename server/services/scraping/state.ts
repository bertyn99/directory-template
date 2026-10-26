/**
 * Redis-based scrape state tracking service.
 *
 * Tracks which source/activity/city combinations have been scraped recently
 * to avoid redundant scraping within a configurable TTL window.
 *
 * Gracefully degrades if Redis is unavailable — logs a warning and returns
 * null/false so scraping is never blocked by infrastructure issues.
 */

/** Default TTL: 24 hours in seconds (Nitro storage uses seconds for TTL) */
const DEFAULT_TTL_SECONDS = 86400

/** Redis key prefix for all scrape state entries */
const KEY_PREFIX = 'scrape'

/** Represents the persisted state of a scrape operation */
export interface ScrapeState {
  /** Full storage key (e.g. scrape:fitnesspark:yoga:paris) */
  key: string
  /** 'completed' or 'failed' */
  statusCode: string
  /** ISO 8601 timestamp of when the state was recorded */
  timestamp: string
}

/**
 * Build a deterministic Redis key for a source/activity/city triple.
 *
 * @param sourceId - Scraper source identifier (e.g. 'fitnesspark')
 * @param activitySlug - Activity slug (e.g. 'yoga')
 * @param cityId - City identifier (e.g. 'paris')
 * @returns Key in the format `scrape:{sourceId}:{activitySlug}:{cityId}`
 */
export function buildStateKey(sourceId: string, activitySlug: string, cityId: string): string {
  return `${KEY_PREFIX}:${sourceId}:${activitySlug}:${cityId}`
}

/**
 * Retrieve the last scrape state for a given key.
 *
 * @param key - Full storage key (from buildStateKey)
 * @returns The persisted ScrapeState, or null if not found / Redis unavailable
 */
export async function getScrapeState(key: string): Promise<ScrapeState | null> {
  try {
    const storage = useStorage('redis')
    const state = await storage.getItem<ScrapeState>(key)
    return state ?? null
  }
  catch (error) {
    console.warn(`[scrape-state] Redis unavailable for getScrapeState(${key}):`, error)
    return null
  }
}

/**
 * Record the result of a scrape operation.
 *
 * @param key - Full storage key (from buildStateKey)
 * @param status - 'completed' or 'failed'
 * @param ttlMs - Optional TTL in milliseconds (defaults to 24h). Converted to seconds for Nitro.
 */
export async function setScrapeState(
  key: string,
  statusCode: 'completed' | 'failed',
  ttlMs?: number,
): Promise<void> {
  try {
    const storage = useStorage('redis')
    const ttlSeconds = ttlMs ? Math.ceil(ttlMs / 1000) : DEFAULT_TTL_SECONDS
    const state: ScrapeState = {
      key,
      statusCode,
      timestamp: new Date().toISOString(),
    }
    await storage.setItem(key, state, { ttl: ttlSeconds })
  }
  catch (error) {
    console.warn(`[scrape-state] Redis unavailable for setScrapeState(${key}):`, error)
  }
}

/**
 * Check whether a city should be skipped because it was recently scraped.
 *
 * Returns true if a completed scrape exists and is still within its TTL window.
 * Returns false (don't skip) if: no state found, last scrape failed,
 * Redis is unavailable, or TTL has expired.
 *
 * @param sourceId - Scraper source identifier
 * @param activitySlug - Activity slug
 * @param cityId - City identifier
 * @param ttlMs - Optional TTL in milliseconds (defaults to 24h)
 * @returns true if the city should be skipped, false otherwise
 */
export async function shouldSkipCity(
  sourceId: string,
  activitySlug: string,
  cityId: string,
  ttlMs?: number,
): Promise<boolean> {
  try {
    const key = buildStateKey(sourceId, activitySlug, cityId)
    const state = await getScrapeState(key)

    if (!state || state.statusCode !== 'completed') {
      return false
    }

    const ttl = ttlMs ?? (DEFAULT_TTL_SECONDS * 1000)
    const elapsed = Date.now() - new Date(state.timestamp).getTime()
    return elapsed < ttl
  }
  catch (error) {
    console.warn(
      `[scrape-state] Redis unavailable for shouldSkipCity(${sourceId}, ${activitySlug}, ${cityId}):`,
      error,
    )
    return false
  }
}
