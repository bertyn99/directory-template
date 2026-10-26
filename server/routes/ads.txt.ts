/**
 * ads.txt — IAB Authorized Digital Sellers declaration for this inventory.
 *
 * Reads the inlined runtimeConfig (populated from NUXT_PUBLIC_ADSENSE_CLIENT at
 * build time) instead of process.env, so the file is always in sync with the
 * publisher ID the ad script was actually built with — a stale ads.txt flags
 * the inventory as unauthorized and quietly kills demand.
 * Format: https://support.google.com/adsense/answer/12171612
 */
export default defineEventHandler((event) => {
  const pubId = useRuntimeConfig(event).public.adsense.client.replace(/^ca-/, '')

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  // Matches the route-rule cache pattern used for other public routes —
  // Cloudflare edge-caches it for anonymous visitors.
  setHeader(event, 'cache-control', 'public, s-maxage=3600, stale-while-revalidate=86400')

  if (!pubId) {
    return '# ads.txt — set NUXT_PUBLIC_ADSENSE_CLIENT (ca-pub-…) to activate AdSense\n'
  }
  return `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`
})
