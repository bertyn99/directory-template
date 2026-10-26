import type { Logger } from "drizzle-orm";

export interface QueryTimingSample {
  name: string;
  durationMs: number;
  timestamp: number;
}

export interface QueryTimingStats {
  count: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  /** p95 after optional outlier trim (see summarizeQueryTimings). */
  p95Ms: number;
}

export interface SummarizeQueryTimingsOptions {
  /** Drop the N slowest samples before computing p95 (p50/min/max use all samples). */
  trimSlowestForP95?: number;
}

const samples: QueryTimingSample[] = [];

export function recordQueryTiming(name: string, durationMs: number): void {
  samples.push({ name, durationMs, timestamp: Date.now() });
}

export function clearQueryTimings(): void {
  samples.length = 0;
}

export function getQueryTimings(): readonly QueryTimingSample[] {
  return samples;
}

export async function timedQuery<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    recordQueryTiming(name, performance.now() - start);
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

export function summarizeQueryTimings(
  filterName?: string,
  options: SummarizeQueryTimingsOptions = {},
): Record<string, QueryTimingStats> {
  const trimSlowest = Math.max(0, options.trimSlowestForP95 ?? 0);
  const grouped = new Map<string, number[]>();

  for (const sample of samples) {
    if (filterName && sample.name !== filterName) continue;
    const bucket = grouped.get(sample.name) ?? [];
    bucket.push(sample.durationMs);
    grouped.set(sample.name, bucket);
  }

  const result: Record<string, QueryTimingStats> = {};

  for (const [name, durations] of grouped) {
    const sorted = [...durations].sort((a, b) => a - b);
    const totalMs = sorted.reduce((sum, value) => sum + value, 0);

    const trimCount = Math.min(trimSlowest, Math.max(0, sorted.length - 1));
    const forP95 =
      trimCount > 0 ? sorted.slice(0, sorted.length - trimCount) : sorted;

    result[name] = {
      count: sorted.length,
      totalMs,
      avgMs: totalMs / sorted.length,
      minMs: sorted[0] ?? 0,
      maxMs: sorted[sorted.length - 1] ?? 0,
      p50Ms: percentile(sorted, 50),
      p95Ms: percentile(forP95, 95),
    };
  }

  return result;
}

/** Drizzle logger — logs SQL text in dev when QUERY_TIMING=1 (duration via pool wrapper). */
export function createSlowQueryLogger(): Logger {
  return {
    logQuery(query: string) {
      if (process.env.QUERY_TIMING_VERBOSE === "1") {
        console.debug(`[query:sql] ${query.replace(/\s+/g, " ").trim().slice(0, 200)}`);
      }
    },
  };
}

export function isQueryTimingEnabled(): boolean {
  return process.env.QUERY_TIMING === "1" || process.env.QUERY_TIMING === "true";
}
