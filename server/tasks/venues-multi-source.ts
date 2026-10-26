import type { ScrapeVenuesJobOptions } from "~~/server/jobs/scrape-venues";
import { scrapeVenuesJob } from "~~/server/jobs/scrape-venues";
import { batchMatchVenues, type BatchMatchResult } from "~~/server/services/scraping/matching-batch";
import { useDrizzle } from "#imports";

export interface MultiSourceTaskOptions extends ScrapeVenuesJobOptions {
  runMatching?: boolean; // Whether to run matching after scraping (default: true)
  matchingBatchSize?: number; // How many venue_sources to match per batch (default: 50)
  matchingConcurrency?: number; // Parallel concurrency within each batch (default: 5)
}

/**
 * Run multi-source scraping and matching pipeline
 */
export default defineTask({
  meta: {
    name: "venues-multi-source",
    description: "Scrape venues from multiple sources and match them to canonical venues",
  },
  async run({ payload }) {
    // Nitro's HTTP task endpoint does `readBody(event).then(r => r?.payload)`
    // so curl must send `{"payload":{...}}` not just `{...}`.
    // Scheduled tasks pass `{ scheduledTime: number }` (no .payload key).
    const raw = payload || {};
    const options = ((raw as Record<string, unknown>).payload && typeof (raw as Record<string, unknown>).payload === 'object'
      ? (raw as Record<string, unknown>).payload
      : raw) as MultiSourceTaskOptions;
    const {
      dryRun = false,
      maxPlaces = 200,
      runMatching = true,
      matchingBatchSize = 50,
      matchingConcurrency = 5,
      ...scrapeOptions
    } = options;

    console.log("Starting multi-source venue scraping and matching pipeline...");
    console.log("Options:", { dryRun, maxPlaces, runMatching, matchingBatchSize, matchingConcurrency, ...scrapeOptions });

    // Step 1: Run scraping job
    console.log("Step 1: Scraping venues from sources...");
    const scrapeMetrics = await scrapeVenuesJob({
      ...scrapeOptions,
      dryRun,
      maxPlaces,
    });
    console.log("Scraping completed:", scrapeMetrics);

    if (!runMatching || dryRun) {
      return {
        result: {
          success: true,
          scrapeMetrics,
          matchingSkipped: true,
        }
      };
    }

    // Step 2: Run batch matching for unmatched venue_sources
    console.log("Step 2: Matching venue_sources to canonical venues...");
    const db = useDrizzle();

    const unmatchedSources = await db.query.venueSources.findMany({
      where: { venueId: { isNull: true } },
      columns: { id: true },
    });

    const matchingResults: BatchMatchResult = await batchMatchVenues({
      unmatchedIds: unmatchedSources.map((s) => s.id),
      concurrency: matchingConcurrency,
      batchSize: matchingBatchSize,
    });

    console.log("Matching completed:", matchingResults);

    return {
      result: {
        success: true,
        scrapeMetrics,
        matchingResults,
      }
    };
  },
});
