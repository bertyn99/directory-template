import { processBatch } from "../scraping/storage";
import { matchVenueSource } from "../venues/matching";
import { checkNewVenueSpike } from "~~/server/services/monitoring/scraperAlerts";

export interface BatchMatchOptions {
  unmatchedIds: number[];
  concurrency: number;
  batchSize: number;
  sourceCode?: string;
}

export interface BatchMatchResult {
  matched: number;
  created: number;
  queued: number;
  errors: number;
  methods: Record<string, number>;
}

type MatchOutput = {
  venueId: number | null;
  method: string;
  confidence?: number;
};

type BatchItem = {
  id: number;
  result: MatchOutput | null;
  error: boolean;
};

/**
 * Execute venue matching in parallel batches with concurrency control.
 *
 * Wraps matchVenueSource for each venue_source ID, tracks method counts,
 * and logs progress after every batch.
 */
export async function batchMatchVenues(options: BatchMatchOptions): Promise<BatchMatchResult> {
  const {
    unmatchedIds,
    concurrency = 5,
    batchSize = 50,
    // Kept for the interface contract — callers pass it to scope logging by
    // source; per-id matching currently resolves the source itself.
    sourceCode: _sourceCode,
  } = options;

  const result: BatchMatchResult = {
    matched: 0,
    created: 0,
    queued: 0,
    errors: 0,
    methods: {},
  };

  const total = unmatchedIds.length;
  let processed = 0;

  // Process in chunks of batchSize
  for (let offset = 0; offset < total; offset += batchSize) {
    const chunk = unmatchedIds.slice(offset, offset + batchSize);

    const items: BatchItem[] = await processBatch<number, BatchItem>(
      chunk,
      async (id): Promise<BatchItem> => {
        try {
          const matchResult = await matchVenueSource(id);
          return { id, result: matchResult, error: false };
        } catch (err) {
          console.error(`[batchMatch] Error matching venue_source ${id}:`, err);
          return { id, result: null, error: true };
        }
      },
      concurrency,
    );

    // Aggregate results from this batch
    for (const item of items) {
      processed++;

      if (item.error) {
        result.errors++;
        continue;
      }

      const method = item.result?.method ?? "none";
      result.methods[method] = (result.methods[method] ?? 0) + 1;

      if (item.result?.venueId != null) {
        if (method === "created") {
          result.created++;
        } else {
          result.matched++;
        }
      } else if (method === "review" || method === "review-pending") {
        result.queued++;
      }
    }

    console.log(
      `Processed ${processed}/${total} venue_sources (matched: ${result.matched}, queued: ${result.queued}, errors: ${result.errors})`,
    );
  }

  // Fire-and-forget spike check for newly created venues
  if (result.created > 0) {
    await checkNewVenueSpike(result.created).catch(() => {});
  }

  return result;
}
