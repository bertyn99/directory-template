import { timingSafeEqual } from 'node:crypto'

/**
 * Public GET routes the site fetches while rendering pages.
 * Admin, user, franchise, and auth routes stay on their session checks.
 */
const EXACT_GETS = new Set([
  '/api/stats',
  '/api/venues',
  '/api/cities',
  '/api/countries',
  '/api/categories',
])

const GET_PATTERNS = [
  /^\/api\/venues\/[^/]+$/,
  /^\/api\/venues\/[^/]+\/(images|activities|equipments|events|formulas)$/,
  /^\/api\/cities\/hub\/[^/]+\/[^/]+$/,
  /^\/api\/categories\/[^/]+$/,
  /^\/api\/categories\/[^/]+\/cities$/,
]

export type ApiAccessInput = {
  method: string
  pathname: string
  scrapeKeyHeader: string | undefined
  expectedScrapeKey: string
  secFetchSite: string | undefined
  origin: string | undefined
  requestHost: string
  /**
   * Nitro local fetch (SSR) uses a mock socket whose remoteAddress is empty.
   * A real TCP client always has an address, so this cannot be spoofed.
   */
  inProcess: boolean
}

export function isNitroLocalRequest(hasSocket: boolean, remoteAddress: string | undefined): boolean {
  return hasSocket && remoteAddress === ''
}

export function scrapeKeyMatches(provided: string | undefined, expected: string): boolean {
  if (!provided || !expected) return false
  const left = Buffer.from(provided)
  const right = Buffer.from(expected)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function isFrontendPublicGet(method: string, pathname: string): boolean {
  if (method.toUpperCase() !== 'GET') return false
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (EXACT_GETS.has(path)) return true
  return GET_PATTERNS.some(pattern => pattern.test(path))
}

function originMatchesHost(origin: string, requestHost: string): boolean {
  try {
    return new URL(origin).host === requestHost
  }
  catch {
    return false
  }
}

/**
 * Browser fetches from this site. `Sec-Fetch-Site` is set by the browser and
 * cannot be changed from page JavaScript. Non-browser clients can still send
 * the header; the scrape key is the credential for those.
 */
function isFirstPartyBrowser(input: ApiAccessInput): boolean {
  const site = input.secFetchSite?.toLowerCase()
  if (site !== 'same-origin' && site !== 'same-site') return false
  if (!input.origin) return site === 'same-origin'
  return originMatchesHost(input.origin, input.requestHost)
}

export function canAccessApi(input: ApiAccessInput): boolean {
  if (!isFrontendPublicGet(input.method, input.pathname)) return true
  if (input.inProcess) return true
  if (scrapeKeyMatches(input.scrapeKeyHeader, input.expectedScrapeKey)) return true
  return isFirstPartyBrowser(input)
}
