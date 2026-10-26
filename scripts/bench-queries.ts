/**
 * Benchmark read queries against live PostgreSQL and compare to baselines.
 *
 * Usage:
 *   pnpm bench:queries              # run + compare
 *   pnpm bench:queries -- --update  # write new baselines
 *   pnpm bench:queries -- --verbose # per-iteration logging
 *
 * Env:
 *   BENCH_ITERATIONS=30       measured iterations (default 30)
 *   BENCH_WARMUP=2            warmup runs per query
 *   BENCH_TRIM_OUTLIERS=1     slowest samples dropped before p95 only
 *   BENCH_SIMPLE_P50_MS=80    gate on p50 (not p95) when lookup is fast
 *   BENCH_REGRESSION_PCT=20   fail threshold vs baseline
 *
 * Reads DATABASE_URL from `.env` (same as drizzle-kit / Nuxt dev).
 */
import { loadEnvFile } from "./load-env";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { relations } from "../server/db/schemas/relations";
import {
  clearQueryTimings,
  recordQueryTiming,
  summarizeQueryTimings,
  type QueryTimingStats,
} from "../server/utils/queryTiming";

loadEnvFile();

// Benchmarks use a standalone Drizzle instance (no NitroStorageCache).
const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINES_PATH = resolve(__dirname, "../test/bench/baselines.json");

const ITERATIONS = Number(process.env.BENCH_ITERATIONS ?? 30);
const WARMUP = Number(process.env.BENCH_WARMUP ?? 2);
const TRIM_OUTLIERS = Number(process.env.BENCH_TRIM_OUTLIERS ?? 1);
const SIMPLE_LOOKUP_P50_MS = Number(process.env.BENCH_SIMPLE_P50_MS ?? 80);
const REGRESSION_THRESHOLD = Number(process.env.BENCH_REGRESSION_PCT ?? 20);

interface BaselineFile {
  updatedAt: string | null;
  environment: string;
  queries: Record<string, { p50Ms: number; p95Ms: number; iterations: number }>;
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    update: args.includes("--update"),
    verbose: args.includes("--verbose"),
  };
}

function loadBaselines(): BaselineFile {
  try {
    return JSON.parse(readFileSync(BASELINES_PATH, "utf-8")) as BaselineFile;
  } catch {
    return { updatedAt: null, environment: "local", queries: {} };
  }
}

function saveBaselines(results: Record<string, QueryTimingStats>): void {
  const file: BaselineFile = {
    updatedAt: new Date().toISOString(),
    environment: process.env.BENCH_ENV ?? "local",
    queries: {},
  };

  for (const [name, stats] of Object.entries(results)) {
    file.queries[name] = {
      p50Ms: round(stats.p50Ms),
      p95Ms: round(stats.p95Ms),
      iterations: stats.count,
    };
  }

  writeFileSync(BASELINES_PATH, `${JSON.stringify(file, null, 2)}\n`);
  console.log(`\nBaselines written to ${BASELINES_PATH}`);
}

function round(ms: number): number {
  return Math.round(ms * 100) / 100;
}

function formatMs(ms: number): string {
  return `${round(ms).toFixed(2)}ms`;
}

async function main() {
  const { update, verbose } = parseArgs();
  const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!connectionString) {
    console.error(
      "DATABASE_URL or TEST_DATABASE_URL is required.\n" +
        "Set it in .env at the project root, or export it in your shell.",
    );
    process.exit(1);
  }

  // Standalone pool — inject into useDrizzle() for query modules (#imports)
  process.env.DATABASE_URL = connectionString;
  const pool = new pg.Pool({ connectionString, max: 3 });
  const db = drizzle({ client: pool, relations });
  const { setDrizzleInstance } = await import("../server/utils/drizzle");
  setDrizzleInstance(db, pool);

  const { readQueryRegistry } = await import("../server/db/queries/read-registry");
  const { resetBenchSamples } = await import("../server/db/queries/read-registry-samples");
  resetBenchSamples();

  const baselines = loadBaselines();
  const failures: string[] = [];
  const results: Record<string, QueryTimingStats> = {};
  let skipped = 0;

  console.log(`Benchmarking ${readQueryRegistry.length} read queries`);
  console.log(
    `Iterations: ${ITERATIONS} (+${WARMUP} warmup), ` +
      `p95 trims slowest ${TRIM_OUTLIERS}, ` +
      `simple gate: p50 when <${SIMPLE_LOOKUP_P50_MS}ms\n`,
  );

  for (const entry of readQueryRegistry) {
    if (entry.skip && (await entry.skip())) {
      console.log(`  SKIP  ${entry.name} (no seed data)`);
      skipped++;
      continue;
    }

    clearQueryTimings();

    for (let i = 0; i < WARMUP + ITERATIONS; i++) {
      const start = performance.now();
      await entry.run();
      const durationMs = performance.now() - start;
      if (i >= WARMUP) {
        recordQueryTiming(entry.name, durationMs);
        if (verbose) {
          console.log(`    ${entry.name} #${i - WARMUP + 1}: ${formatMs(durationMs)}`);
        }
      }
    }

    const stats = summarizeQueryTimings(entry.name, {
      trimSlowestForP95: TRIM_OUTLIERS,
    })[entry.name];
    if (!stats) continue;

    results[entry.name] = stats;

    const baseline = baselines.queries[entry.name];
    let status = baseline ? "OK   " : "NEW  ";

    if (baseline && !update) {
      const isSimple = stats.p50Ms < SIMPLE_LOOKUP_P50_MS || baseline.p50Ms < SIMPLE_LOOKUP_P50_MS;
      const metric = isSimple ? stats.p50Ms : stats.p95Ms;
      const baselineMetric = isSimple ? baseline.p50Ms : baseline.p95Ms;
      const metricLabel = isSimple ? "p50" : "p95";
      const regressionPct = ((metric - baselineMetric) / baselineMetric) * 100;

      if (regressionPct > REGRESSION_THRESHOLD) {
        status = "FAIL ";
        failures.push(
          `${entry.name}: ${metricLabel} ${formatMs(metric)} vs baseline ${formatMs(baselineMetric)} (+${regressionPct.toFixed(0)}%)`,
        );
      }
    }

    const baselineLabel = baseline
      ? ` (baseline p50=${formatMs(baseline.p50Ms)} p95=${formatMs(baseline.p95Ms)})`
      : "";

    console.log(
      `  ${status} ${entry.name}`,
      `p50=${formatMs(stats.p50Ms)}`,
      `p95=${formatMs(stats.p95Ms)}`,
      `max=${formatMs(stats.maxMs)}${baselineLabel}`,
    );
  }

  const { closeDrizzlePool } = await import("../server/utils/drizzle");
  await closeDrizzlePool();

  if (update) {
    saveBaselines(results);
  } else if (Object.keys(baselines.queries).length === 0) {
    console.log("\nNo baselines recorded yet. Run with --update to establish baselines.");
  }

  if (failures.length > 0) {
    console.error("\nRegressions detected:");
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  console.log(`\nDone. ${Object.keys(results).length} measured, ${skipped} skipped.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
