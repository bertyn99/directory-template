import { createError, defineEventHandler, getMethod, getRequestHeader, getRequestHost, getRequestURL } from 'h3'
import { useRuntimeConfig } from '#imports'
import { canAccessApi, isNitroLocalRequest } from '~~/server/utils/apiAccess'

/**
 * Public catalog GETs stay callable from this site (SSR and the browser) and
 * from a client that sends `X-Scrape-Key`. Other callers get 401.
 * Session-protected routes (admin, users, franchises, auth) are unchanged.
 */
export default defineEventHandler((event) => {
  const pathname = getRequestURL(event).pathname
  if (!pathname.startsWith('/api/')) return

  const socket = event.node?.req?.socket
  const allowed = canAccessApi({
    method: getMethod(event),
    pathname,
    scrapeKeyHeader: getRequestHeader(event, 'x-scrape-key'),
    expectedScrapeKey: useRuntimeConfig(event).scrapeApiKey || '',
    secFetchSite: getRequestHeader(event, 'sec-fetch-site'),
    origin: getRequestHeader(event, 'origin'),
    requestHost: getRequestHost(event, { xForwardedHost: true }),
    inProcess: isNitroLocalRequest(Boolean(socket), socket?.remoteAddress),
  })

  if (!allowed) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
})
