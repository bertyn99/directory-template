import { accessAdmin } from "~~/shared/utils/abilities";

/**
 * Auth for server-side task endpoints. Accepts either:
 * - the scrape API key via the `X-Scrape-Key` header (agent / curl driven), or
 * - an admin user session (cookie).
 *
 * Mirrors the auth pattern of `/api/venues/scrape`.
 */
export async function requireTaskAuth(event): Promise<void> {
  const config = useRuntimeConfig(event);
  const apiKey = getRequestHeader(event, "x-scrape-key");
  if (
    config.scrapeApiKey &&
    apiKey &&
    apiKey === config.scrapeApiKey
  ) {
    return;
  }

  await requireUserSession(event);
  await authorize(event, accessAdmin);
}
