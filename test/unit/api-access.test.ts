import { describe, expect, it } from 'vitest'
import { canAccessApi, isNitroLocalRequest, scrapeKeyMatches, type ApiAccessInput } from '~~/server/utils/apiAccess'

const KEY = 'test-scrape-key'

function input(overrides: Partial<ApiAccessInput> = {}): ApiAccessInput {
  return {
    method: 'GET',
    pathname: '/api/venues',
    scrapeKeyHeader: undefined,
    expectedScrapeKey: KEY,
    secFetchSite: undefined,
    origin: undefined,
    requestHost: 'example-directory.com',
    inProcess: false,
    ...overrides,
  }
}

describe('isNitroLocalRequest', () => {
  it('recognises the mock socket used by Nitro local fetch', () => {
    expect(isNitroLocalRequest(true, '')).toBe(true)
  })

  it('rejects a real TCP client', () => {
    expect(isNitroLocalRequest(true, '127.0.0.1')).toBe(false)
    expect(isNitroLocalRequest(true, '::1')).toBe(false)
    expect(isNitroLocalRequest(false, '')).toBe(false)
    expect(isNitroLocalRequest(false, undefined)).toBe(false)
  })
})

describe('scrapeKeyMatches', () => {
  it('accepts the configured key', () => {
    expect(scrapeKeyMatches(KEY, KEY)).toBe(true)
  })

  it('rejects a missing, empty, or wrong key', () => {
    expect(scrapeKeyMatches(undefined, KEY)).toBe(false)
    expect(scrapeKeyMatches('', KEY)).toBe(false)
    expect(scrapeKeyMatches(KEY, '')).toBe(false)
    expect(scrapeKeyMatches('other-key-value', KEY)).toBe(false)
  })
})

describe('canAccessApi', () => {
  it('ignores non-api paths and non-GET requests', () => {
    expect(canAccessApi(input({ pathname: '/venues' }))).toBe(true)
    expect(canAccessApi(input({ method: 'POST', pathname: '/api/venues/scrape' }))).toBe(true)
    expect(canAccessApi(input({ method: 'POST', pathname: '/api/auth/login' }))).toBe(true)
  })

  it('leaves session-protected routes alone', () => {
    expect(canAccessApi(input({ pathname: '/api/admin/match-candidates' }))).toBe(true)
    expect(canAccessApi(input({ pathname: '/api/users/venues' }))).toBe(true)
    expect(canAccessApi(input({ pathname: '/api/franchises' }))).toBe(true)
    expect(canAccessApi(input({ pathname: '/api/activities' }))).toBe(true)
  })

  it('allows in-process calls from the site renderer', () => {
    expect(canAccessApi(input({ inProcess: true }))).toBe(true)
  })

  it('allows a browser fetch from this host', () => {
    expect(canAccessApi(input({
      secFetchSite: 'same-origin',
      origin: 'https://example-directory.com',
    }))).toBe(true)
    expect(canAccessApi(input({ secFetchSite: 'same-origin' }))).toBe(true)
  })

  it('rejects a browser fetch whose origin is another host', () => {
    expect(canAccessApi(input({
      secFetchSite: 'same-site',
      origin: 'http://localhost:9999',
      requestHost: 'localhost:3000',
    }))).toBe(false)
    expect(canAccessApi(input({
      secFetchSite: 'cross-site',
      origin: 'https://evil.example',
    }))).toBe(false)
  })

  it('allows the scrape key from outside the site', () => {
    expect(canAccessApi(input({ scrapeKeyHeader: KEY }))).toBe(true)
  })

  it('rejects an outside caller without the key', () => {
    expect(canAccessApi(input())).toBe(false)
    expect(canAccessApi(input({ scrapeKeyHeader: 'nope' }))).toBe(false)
  })

  it('covers the public catalog GETs the pages call', () => {
    for (const pathname of [
      '/api/stats',
      '/api/cities',
      '/api/cities/hub/france/paris',
      '/api/countries',
      '/api/categories',
      '/api/categories/yoga',
      '/api/categories/yoga/cities',
      '/api/venues/some-venue',
      '/api/venues/12/images',
    ]) {
      expect(canAccessApi(input({ pathname }))).toBe(false)
      expect(canAccessApi(input({ pathname, scrapeKeyHeader: KEY }))).toBe(true)
    }
  })
})
