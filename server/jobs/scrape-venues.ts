import { createContext, closeBrowser } from "~~/server/services/scraping/browser";
import { processBatch } from "~~/server/services/scraping/storage";
import { extractUniqueObjects } from "~~/server/utils/format";
import { getSourceById, getAllSources } from "~~/server/services/scraping/sources/registry";
import type { ScrapingSourceAdapter, PlaceData } from "~~/server/services/scraping/sources/types";
import { ingestVenueSources } from "~~/server/services/venues/ingest";
import { promises as fs } from "fs";
import { join } from "path";
import { createRateLimiter } from "~~/server/services/scraping/rate-limit";
import { shouldSkipCity, setScrapeState, buildStateKey } from "~~/server/services/scraping/state";

export interface ScrapeVenuesJobOptions {
  sourceIds?: string[] | string; // Specific source IDs to scrape
  sourceId?: string; // Alias for sourceIds
  skipStateCheck?: boolean; // If true, ignore Redis scrape state (re-scrape everything)
  maxPagesPerCity?: number; // Max pages per city (default: 10)
  maxCities?: number; // Max cities processed per activity (optional, for smoke tests/partial runs)
  dryRun?: boolean; // If true, skip DB writes and collect data in memory
  maxPlaces?: number; // Max total places to scrape in dry-run mode (default: 200)
}

export interface ScrapeMetrics {
  sourceId: string;
  country: string;
  locale: string;
  activitiesProcessed: number;
  citiesProcessed: number;
  venuesProcessed: number;
  errors: Array<{ type: string; message: string }>;
  citiesSkipped: number;
}

/** Dry-run output written to .scratch/ */
export interface DryRunResult {
  meta: {
    sourceId: string;
    country: string;
    timestamp: string;
    maxPlaces: number;
  };
  stats: {
    activities: number;
    cities: number;
    places: number;
    capped: boolean;
  };
  samples: PlaceData[];
}

/**
 * Main scraping job with multi-source support
 */
export async function scrapeVenuesJob(
  options: ScrapeVenuesJobOptions = {},
): Promise<ScrapeMetrics[]> {
  const {
    sourceIds,
    sourceId,
    skipStateCheck = false,
    // Undefined → each adapter applies its own per-city default
    maxPagesPerCity,
    maxCities,
    dryRun = false,
    maxPlaces = 200,
  } = options as ScrapeVenuesJobOptions & { sourceId?: string };

  // Resolve sources to scrape
  let sourcesToScrape: ScrapingSourceAdapter[];

  let ids: string[] = [];
  if (Array.isArray(sourceIds)) {
    ids = sourceIds;
  } else if (typeof sourceIds === "string") {
    ids = sourceIds.split(",").map((s) => s.trim());
  }

  if (sourceId && typeof sourceId === "string") {
    ids.push(...sourceId.split(",").map((s) => s.trim()));
  }

  if (ids.length > 0) {
    sourcesToScrape = ids
      .map((id) => getSourceById(id))
      .filter((s): s is ScrapingSourceAdapter => s !== undefined);
  } else {
    sourcesToScrape = getAllSources();
  }

  if (sourcesToScrape.length === 0) {
    throw new Error(`No sources found to scrape`);
  }

  // Only launch the browser if any selected source requires it
  // (sources with requiresBrowser: false are plain-HTTP scrapers)
  const needsBrowser = sourcesToScrape.some((s) => s.meta.requiresBrowser !== false);
  const context = needsBrowser ? await createContext() : null;
  const allMetrics: ScrapeMetrics[] = [];

  // Dry-run accumulator
  const dryRunAccumulator: PlaceData[] = [];
  let dryRunCapped = false;

  const rateLimiter = createRateLimiter();
  try {
    // Process each source
    for (const source of sourcesToScrape) {
      const metrics: ScrapeMetrics = {
        sourceId: source.meta.id,
        country: source.meta.countries.join(","),
        locale: source.meta.locales.join(","),
        activitiesProcessed: 0,
        citiesProcessed: 0,
        venuesProcessed: 0,
        errors: [],
        citiesSkipped: 0,
      };

      try {
        const scrapingContext = { browserContext: context };

        // Get activities
        console.log(`[${source.meta.id}] Fetching activities...`);
        const activities = await source.getActivities(scrapingContext);
        console.log(`[${source.meta.id}] Found ${activities.length} activities`);

        if (activities.length === 0) {
          metrics.errors.push({
            type: "no_activities",
            message: "No activities found",
          });
          allMetrics.push(metrics);
          continue;
        }

        const processedCityIds = new Set<string>();

        for (const activity of activities) {
          console.log(`[${source.meta.id}] Processing activity: ${activity.name}`);

          // Get cities for this activity
          const cities = await source.getCitiesForActivity(scrapingContext, activity);
          const uniqueCities = extractUniqueObjects(cities, "id");
          if (maxCities !== undefined) uniqueCities.splice(maxCities);

          console.log(
            `[${source.meta.id}] Activity ${activity.name} has ${uniqueCities.length} cities`,
          );
          metrics.activitiesProcessed++;

          // Process cities with concurrency control
          await processBatch(
            uniqueCities,
            async (city) => {
              if (processedCityIds.has(city.id)) {
                return;
              }
              processedCityIds.add(city.id);

              // Check dry-run cap before processing
              if (dryRun && dryRunCapped) return;

              const stateKey = buildStateKey(source.meta.id, activity.name, city.id);
              if (
                !skipStateCheck &&
                (await shouldSkipCity(source.meta.id, activity.name, city.id))
              ) {
                metrics.citiesSkipped++;
                return;
              }

              try {
                const places = await rateLimiter.executeWithRetry(
                  () =>
                    source.getPlacesForCity(scrapingContext, city, { maxPages: maxPagesPerCity }),
                  source.meta.id,
                );

                if (places.length > 0) {
                  if (dryRun) {
                    // Accumulate in memory, respect cap
                    const remaining = maxPlaces - dryRunAccumulator.length;
                    if (remaining > 0) {
                      const toAdd = places.slice(0, remaining);
                      dryRunAccumulator.push(...toAdd);
                      if (dryRunAccumulator.length >= maxPlaces) {
                        dryRunCapped = true;
                      }
                    }
                    console.log(
                      `[DRY-RUN] Found ${places.length} places for city ${city.city} (not saving to DB) [total: ${dryRunAccumulator.length}/${maxPlaces}]`,
                    );
                    metrics.venuesProcessed += places.length;
                  } else {
                    // Ingest places into venue_sources
                    const ingestionResult = await ingestVenueSources({
                      source,
                      activity,
                      city,
                      places,
                    });

                    metrics.venuesProcessed += ingestionResult.ingested;
                    metrics.errors.push(
                      ...ingestionResult.errors.map((e) => ({
                        type: "ingestion_error",
                        message: `${e.place}: ${e.error}`,
                      })),
                    );

                    console.log(
                      `[${source.meta.id}] Processed ${ingestionResult.ingested} venues for city ${city.city}`,
                    );
                  }
                }

                metrics.citiesProcessed++;
                await setScrapeState(stateKey, "completed");
              } catch (error) {
                const err = error as Error;
                metrics.errors.push({
                  type: "city_processing",
                  message: `Error processing city ${city.city}: ${err.message}`,
                });
                console.error(`[${source.meta.id}] Error processing city ${city.city}:`, err);
                await setScrapeState(stateKey, "failed");
              }
            },
            source.meta.maxConcurrency ?? 2,
          );
        }

        console.log(`[${source.meta.id}] Scraping completed:`, metrics);
        allMetrics.push(metrics);
      } catch (error) {
        const err = error as Error;
        metrics.errors.push({
          type: "source_scraping_error",
          message: err.message,
        });
        console.error(`[${source.meta.id}] Scraping error:`, err);
        allMetrics.push(metrics);
      }
    }

    // Write dry-run output if applicable
    if (dryRun) {
      const firstSource = sourcesToScrape[0]!;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const outputDir = join(process.cwd(), ".scratch");
      await fs.mkdir(outputDir, { recursive: true });

      const outputPath = join(outputDir, `dry-run-${firstSource.meta.id}-${timestamp}.json`);

      // Build samples: first 5 per city (unique by name)
      const samples = dryRunAccumulator.slice(0, 50);

      const dryRunResult: DryRunResult = {
        meta: {
          sourceId: firstSource.meta.id,
          country: firstSource.meta.countries.join(","),
          timestamp: new Date().toISOString(),
          maxPlaces,
        },
        stats: {
          activities: allMetrics.reduce((a, m) => a + m.activitiesProcessed, 0),
          cities: allMetrics.reduce((a, m) => a + m.citiesProcessed, 0),
          places: dryRunAccumulator.length,
          capped: dryRunCapped,
        },
        samples,
      };

      await fs.writeFile(outputPath, JSON.stringify(dryRunResult, null, 2));
      console.log(`[DRY-RUN] Output written to ${outputPath}`);
      console.log(
        `[DRY-RUN] Stats: ${dryRunResult.stats.places} places, ${dryRunResult.stats.cities} cities, capped=${dryRunCapped}`,
      );
    }

    return allMetrics;
  } finally {
    if (context) await context.close();
    if (needsBrowser) await closeBrowser();
  }
}
