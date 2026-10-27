/**
 * Visitor IP as seen by this app (Cloudflare in front of the configured site origin).
 *
 * Keep in sync with the cloak handler in patches/nuxt-umami.patch
 * (node_modules/nuxt-umami/dist/runtime/server/endpoint.js). That handler
 * cannot import this module; the algorithm is duplicated there on purpose.
 *
 * Header order matches nuxt-security rate limiting (`ipHeader: 'cf-connecting-ip'`):
 * Cloudflare sets cf-connecting-ip to the real visitor. x-forwarded-for is a
 * fallback only — Umami (behind its own Cloudflare) prefers cf-connecting-ip
 * of the *server-to-server* hop, which is the Hetzner VPS in DE.
 */

export type HeaderMap = Record<string, string | undefined | null>

export function firstForwardedHop(value: string | undefined | null): string {
  if (!value) return ''
  return value.split(',')[0]?.trim() ?? ''
}

/** Loopback + RFC1918 + IPv6 ULA/link-local. Do not send these to Umami as payload.ip. */
export function isNonPublicIp(ip: string): boolean {
  return /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|::ffff:127\.|fc00:|fe80:)/i.test(ip)
}

export function resolveVisitorIp(headers: HeaderMap, fallback = ''): string {
  return firstForwardedHop(headers['cf-connecting-ip'])
    || firstForwardedHop(headers['true-client-ip'])
    || firstForwardedHop(headers['x-real-ip'])
    || firstForwardedHop(headers['x-forwarded-for'])
    || fallback
}

/**
 * IP Umami should geolocate. Empty means: do not override (dev / loopback).
 * Umami 2.17+ uses payload.ip to skip CDN geo headers (cf-ipcountry of the cloak hop).
 */
export function umamiClientOverride(headers: HeaderMap, fallback = ''): string {
  const ip = resolveVisitorIp(headers, fallback)
  if (!ip || isNonPublicIp(ip)) return ''
  return ip
}
