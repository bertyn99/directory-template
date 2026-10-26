import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { sql, eq, and, or, inArray, like } from "drizzle-orm";
import pg from "pg";
import * as schema from "../db/schemas";
import { relations } from "../db/schemas/relations";
import { createSlowQueryLogger, isQueryTimingEnabled } from "./queryTiming";

const { Pool } = pg;

export { sql, eq, and, or, inArray, like };
export const tables = schema;

export type DB = NodePgDatabase<typeof relations>;

/** Drizzle handles accepted via setDrizzleInstance: prod pg pool handle or PGlite-backed test handle. */
export type InjectableDb = DB | PgliteDatabase<typeof relations>;

let drizzleInstance: InjectableDb | null = null;
let poolInstance: pg.Pool | null = null;

function wrapPoolForTiming(pool: pg.Pool): pg.Pool {
  const thresholdMs = Number(process.env.QUERY_TIMING_SLOW_MS ?? 50);
  const originalQuery = pool.query.bind(pool);

  pool.query = ((...args: Parameters<typeof originalQuery>) => {
    const start = performance.now();
    const result = originalQuery(...args);
    const logSlow = (durationMs: number) => {
      if (durationMs >= thresholdMs) {
        const sqlText =
          typeof args[0] === "string" ? args[0] : (args[0] as { text?: string }).text;
        console.warn(
          `[query:slow ${durationMs.toFixed(1)}ms] ${sqlText?.slice(0, 120) ?? "unknown"}`,
        );
      }
    };

    if (typeof (result as Promise<unknown>)?.then === "function") {
      return (result as Promise<unknown>).then(
        (value) => {
          logSlow(performance.now() - start);
          return value;
        },
        (error: unknown) => {
          logSlow(performance.now() - start);
          throw error;
        },
      );
    }

    logSlow(performance.now() - start);
    return result;
  }) as typeof pool.query;

  return pool;
}

function createPool(): pg.Pool {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS ?? 30_000),
    connectionTimeoutMillis: Number(process.env.DB_POOL_CONNECTION_TIMEOUT_MS ?? 5_000),
  });
  return isQueryTimingEnabled() ? wrapPoolForTiming(pool) : pool;
}

/** Inject a Drizzle instance (benchmarks / integration tests). */
export function setDrizzleInstance(db: InjectableDb, pool?: pg.Pool): void {
  drizzleInstance = db;
  if (pool) poolInstance = pool;
}

/** Reset singleton between benchmark runs or tests. */
export function resetDrizzleInstance(): void {
  drizzleInstance = null;
  poolInstance = null;
}

export async function closeDrizzlePool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    resetDrizzleInstance();
  }
}

export function useDrizzle() {
  if (drizzleInstance) return drizzleInstance;

  poolInstance = createPool();
  drizzleInstance = drizzle({
    client: poolInstance,
    relations,
    logger: isQueryTimingEnabled() ? createSlowQueryLogger() : undefined,
    // cache: isDrizzleCacheEnabled() ? createNitroStorageCache() : undefined,
    // Enable after global + per-query optimizations — see server/utils/drizzleNitroCache.ts
  });
  return drizzleInstance;
}
