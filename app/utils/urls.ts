/**
 * Safe outbound href for user/scraper-supplied URLs (venue website, booking
 * URL, franchise social links). Prepends https:// when the protocol is
 * missing, and NEVER returns a dangerous scheme: `javascript:` / `data:` /
 * `vbscript:` payloads become undefined so the link is not rendered at all.
 * Zod's `.url()` alone is NOT enough — it is a bare `new URL()` parse and
 * happily accepts `javascript:alert(1)` (audit H1).
 */
export function ensureUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return undefined;
  return `https://${trimmed}`;
}
