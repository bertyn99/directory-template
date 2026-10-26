import { sql, inArray } from "~~/server/utils/drizzle";
import { venues } from "~~/server/db/schemas";

/** Private/reserved IP ranges to block (SSRF protection). */
const PRIVATE_IP_PATTERNS = [
  /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.|0\.)/,
  /^(::1|fc00:|fd|fe80:)/,
];

/** Check if a hostname resolves to or is a private IP. */
function isPrivateHost(hostname: string): boolean {
  // Check if hostname is already an IP
  if (PRIVATE_IP_PATTERNS.some((p) => p.test(hostname))) return true;
  // Check common localhost variants
  if (hostname === "localhost" || hostname.endsWith(".local")) return true;
  return false;
}

/** Validate URL is safe to fetch (SSRF protection). */
function isSafeUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    if (isPrivateHost(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export default defineTask({
  meta: {
    name: "validate-venue-websites",
    description:
      "Checks all venue websites via HEAD (GET fallback on 405), nulls only permanent failures (404/410). Logs transient errors (5xx/timeout) for review. Payload: { dryRun?: boolean, limit?: number, timeoutMs?: number }",
  },
  async run({ payload }) {
    const dryRun = payload?.dryRun === true || payload?.dryRun === "true";
    const limit = (payload?.limit as number | undefined) ?? 500;
    const timeoutMs = (payload?.timeoutMs as number | undefined) ?? 8000;

    console.log(
      `[validate-venue-websites] Starting (dryRun=${dryRun}, limit=${limit}, timeout=${timeoutMs}ms)`,
    );

    const db = useDrizzle();

    // Fetch venues with non-null websites
    const venuesWithWebsites = await db
      .select({ id: venues.id, name: venues.name, slug: venues.slug, website: venues.website })
      .from(venues)
      .where(sql`${venues.website} IS NOT NULL`)
      .limit(limit);

    console.log(`[validate-venue-websites] Checking ${venuesWithWebsites.length} venue websites...`);

    let checked = 0;
    let nulled = 0;
    let healthy = 0;
    let transient = 0;
    const toNull: { id: number; name: string; slug: string; website: string; status: string }[] = [];
    const transientErrors: { id: number; name: string; slug: string; website: string; status: string }[] = [];

    // Process in small batches to avoid flooding
    const batchSize = 10;
    for (let i = 0; i < venuesWithWebsites.length; i += batchSize) {
      const batch = venuesWithWebsites.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (venue) => {
          checked++;
          if (!venue.website) return;
          const website: string = venue.website;

          const url = website.startsWith("http") ? website : `https://${website}`;

          // SSRF protection: skip private/internal URLs
          if (!isSafeUrl(url)) {
            transient++;
            transientErrors.push({
              id: venue.id,
              name: venue.name,
              slug: venue.slug,
              website: website,
              status: "blocked: private/internal URL (SSRF protection)",
            });
            return;
          }

          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);

            let response = await fetch(url, {
              method: "HEAD",
              signal: controller.signal,
              redirect: "follow",
              headers: { "User-Agent": "DirectoryTemplate-Bot/1.0 (link-validator)" },
            });

            // Fallback to GET if HEAD returns 405 (many servers don't support HEAD)
            if (response.status === 405) {
              response = await fetch(url, {
                method: "GET",
                signal: controller.signal,
                redirect: "follow",
                headers: { "User-Agent": "DirectoryTemplate-Bot/1.0 (link-validator)" },
              });
            }

            clearTimeout(timer);

            const status = response.status;

            if (status === 404 || status === 410) {
              // Permanent failure → null the website
              nulled++;
              toNull.push({
                id: venue.id,
                name: venue.name,
                slug: venue.slug,
                website: website,
                status: String(status),
              });
            } else if (status >= 400) {
              // Other 4xx (403, 429, etc.) → transient, don't null
              transient++;
              transientErrors.push({
                id: venue.id,
                name: venue.name,
                slug: venue.slug,
                website: website,
                status: String(status),
              });
            } else {
              // 2xx/3xx → healthy
              healthy++;
            }
          } catch (err: unknown) {
            // Network errors, timeouts, DNS failures → transient, don't null
            transient++;
            const errorMsg = err instanceof Error ? err.message.slice(0, 80) : "unknown error";
            transientErrors.push({
              id: venue.id,
              name: venue.name,
              slug: venue.slug,
              website: website,
              status: `error: ${errorMsg}`,
            });
          }
        }),
      );

      // Small delay between batches to be polite
      if (i + batchSize < venuesWithWebsites.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Null out permanently broken websites (404/410) unless dry-run
    if (!dryRun && toNull.length > 0) {
      const brokenIds = toNull.map((c) => c.id);
      await db
        .update(venues)
        .set({ website: null })
        .where(inArray(venues.id, brokenIds));

      console.log(`[validate-venue-websites] Nulled ${toNull.length} permanently broken websites (404/410).`);
    }

    const summary = `Checked: ${checked}, Healthy: ${healthy}, Nulled: ${nulled}, Transient errors: ${transient}${dryRun ? " (DRY RUN)" : ""}`;
    console.log(`[validate-venue-websites] ${summary}`);

    if (toNull.length > 0) {
      console.log(
        `[validate-venue-websites] Permanently broken (nulled):\n` +
          toNull.map((c) => `  - ${c.name} (${c.slug}): ${c.website} → ${c.status}`).join("\n"),
      );
    }

    if (transientErrors.length > 0) {
      console.log(
        `[validate-venue-websites] Transient errors (not nulled — review manually):\n` +
          transientErrors.map((c) => `  - ${c.name} (${c.slug}): ${c.website} → ${c.status}`).join("\n"),
      );
    }

    return { result: "success", checked, healthy, nulled: dryRun ? 0 : nulled, transient, transientErrors: transientErrors.length };
  },
});
