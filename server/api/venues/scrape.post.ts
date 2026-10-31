import { scrapeVenuesJob } from "~~/server/jobs/scrape-venues";
import { batchMatchVenues } from "~~/server/services/scraping/matching-batch";
import { scrapeKeyMatches } from "~~/server/utils/apiAccess";
import { z } from "zod";
import { useDrizzle } from "#imports";
import { recordScraperRun, checkScraperYield } from "~~/server/services/monitoring/scraperAlerts";

// Bounded body (audit L1): an authenticated ops endpoint, but never trust an
// unbounded payload — sizes cap at one scrape run's realistic maximum.
const scrapeRequestBodySchema = z.object({
  sourceIds: z.array(z.string().max(64)).max(20).optional(),
  dryRun: z.boolean().optional(),
  maxPlaces: z.number().int().min(1).max(5000).optional(),
  skipStateCheck: z.boolean().optional(),
  runMatching: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const apiKey = getRequestHeader(event, "x-scrape-key");
  // Timing-safe compare — never a plain string equality on a secret.
  if (!scrapeKeyMatches(apiKey, config.scrapeApiKey)) {
    throw createError({ statusCode: 401, statusMessage: "Invalid or missing API key" });
  }
  const body = await readValidatedBody(event, scrapeRequestBodySchema.parse);
  const {
    sourceIds,
    dryRun = true,
    maxPlaces = 50,
    skipStateCheck = false,
    runMatching = false,
  } = body;

  const metrics = await scrapeVenuesJob({
    sourceIds,
    dryRun,
    maxPlaces,
    skipStateCheck,
  });

  let matchingResults = null;
  if (runMatching && !dryRun) {
    const db = useDrizzle();
    const unmatchedSources = await db.query.venueSources.findMany({
      where: { venueId: { isNull: true } },
      columns: { id: true },
    });

    if (unmatchedSources.length > 0) {
      matchingResults = await batchMatchVenues({
        unmatchedIds: unmatchedSources.map((s) => s.id),
        concurrency: 5,
        batchSize: 50,
        sourceCode: sourceIds?.length === 1 ? sourceIds[0] : undefined,
      });
    }
  }

  // Fire-and-forget scraper yield monitoring (non-blocking).
  // `scrapeVenuesJob` currently returns ScrapeMetrics[] without a `sources` map,
  // so this legacy payload shape is never present — the guard keeps it inert.
  type ScraperYieldPayload = { sources?: Record<string, { scraped?: number } | undefined> };
  if (!dryRun) {
    const yieldPayload = metrics as unknown as ScraperYieldPayload;
    if (yieldPayload.sources) {
      for (const [source, data] of Object.entries(yieldPayload.sources)) {
        const itemsScraped = data?.scraped ?? 0;
        if (itemsScraped > 0) {
          recordScraperRun(source, itemsScraped).catch(() => {});
          checkScraperYield(source, itemsScraped).catch(() => {});
        }
      }
    }
  }

  return {
    success: true,
    metrics,
    matching: matchingResults,
  };
});
