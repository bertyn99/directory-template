import { describe, expect, it } from 'vitest'
import {
  firstForwardedHop,
  isNonPublicIp,
  resolveVisitorIp,
  umamiClientOverride,
} from '~~/shared/utils/clientIp'

describe('firstForwardedHop', () => {
  it('takes the leftmost address in a forwarded chain', () => {
    expect(firstForwardedHop('203.0.113.10, 10.0.0.1, 127.0.0.1')).toBe('203.0.113.10')
  })

  it('returns empty for missing values', () => {
    expect(firstForwardedHop(undefined)).toBe('')
    expect(firstForwardedHop(null)).toBe('')
    expect(firstForwardedHop('')).toBe('')
  })
})

describe('isNonPublicIp', () => {
  it('rejects loopback and RFC1918', () => {
    expect(isNonPublicIp('127.0.0.1')).toBe(true)
    expect(isNonPublicIp('10.0.0.4')).toBe(true)
    expect(isNonPublicIp('192.168.1.1')).toBe(true)
    expect(isNonPublicIp('172.16.0.1')).toBe(true)
    expect(isNonPublicIp('::1')).toBe(true)
  })

  it('accepts public v4', () => {
    expect(isNonPublicIp('203.0.113.10')).toBe(false)
    expect(isNonPublicIp('82.64.12.4')).toBe(false)
  })
})

describe('resolveVisitorIp', () => {
  it('prefers Cloudflare connecting IP over x-forwarded-for', () => {
    // Regression: cloak used x-forwarded-for, then Umami geolocated the
    // Hetzner VPS via cf-connecting-ip / cf-ipcountry on the outbound hop.
    expect(resolveVisitorIp({
      'cf-connecting-ip': '203.0.113.10',
      'x-forwarded-for': '49.12.0.1',
      'x-real-ip': '10.0.0.1',
    })).toBe('203.0.113.10')
  })

  it('falls back through true-client-ip, x-real-ip, then x-forwarded-for', () => {
    expect(resolveVisitorIp({
      'true-client-ip': '198.51.100.2',
      'x-real-ip': '203.0.113.10',
      'x-forwarded-for': '192.0.2.1',
    })).toBe('198.51.100.2')

    expect(resolveVisitorIp({
      'x-real-ip': '203.0.113.10',
      'x-forwarded-for': '192.0.2.1',
    })).toBe('203.0.113.10')

    expect(resolveVisitorIp({
      'x-forwarded-for': '192.0.2.1, 10.0.0.1',
    })).toBe('192.0.2.1')
  })

  it('uses the socket fallback when no forwarding headers exist', () => {
    expect(resolveVisitorIp({}, '198.51.100.9')).toBe('198.51.100.9')
  })
})

describe('umamiClientOverride', () => {
  it('stamps a public Cloudflare visitor IP for payload.ip', () => {
    expect(umamiClientOverride({
      'cf-connecting-ip': '82.64.12.4',
      'x-forwarded-for': '49.12.0.1',
    })).toBe('82.64.12.4')
  })

  it('does not override with loopback (local cloak would poison geo)', () => {
    expect(umamiClientOverride({
      'x-forwarded-for': '127.0.0.1',
    })).toBe('')
  })
})
