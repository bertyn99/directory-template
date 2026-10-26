import {
  Cache,
  type MutationOption,
} from "drizzle-orm/cache/core";
import type { CacheConfig } from "drizzle-orm/cache/core/types";
import { entityKind, is } from "drizzle-orm/entity";
import { OriginalName, Table } from "drizzle-orm/table";

const CACHE_PREFIX = "drizzle:";
const TAG_MAP_PREFIX = `${CACHE_PREFIX}tag:`;
/** Per-table, per-query-hash index entries — avoids RMW races on a shared array key. */
const TABLE_INDEX_PREFIX = `${CACHE_PREFIX}idx:`;
const NON_AUTO_PREFIX = `${CACHE_PREFIX}non-auto:`;

function queryKey(queryHash: string): string {
  return `${CACHE_PREFIX}query:${queryHash}`;
}

function tableIndexKey(table: string, queryHash: string): string {
  return `${TABLE_INDEX_PREFIX}${table}:${queryHash}`;
}

function tableIndexPrefix(table: string): string {
  return `${TABLE_INDEX_PREFIX}${table}:`;
}

function resolveTtlSeconds(config?: CacheConfig, fallbackSeconds = 3600): number {
  if (config?.ex) return config.ex;
  if (config?.px) return Math.ceil(config.px / 1000);
  return fallbackSeconds;
}

function logCacheError(operation: string, error: unknown): void {
  console.warn(`[drizzle:cache] ${operation} failed`, error);
}

/**
 * Drizzle ORM cache adapter backed by Nitro KV storage (Redis in production).
 * Opt-in per query via `.$withCache()` — strategy is `explicit` (nothing cached by default).
 *
 * Redis errors degrade gracefully: get → cache miss (DB fallback), put/onMutate → no-op.
 *
 * @see https://orm.drizzle.team/docs/cache#custom-cache
 * @see https://nitro.build/docs/storage
 */
export class NitroStorageCache extends Cache {
  static override readonly [entityKind] = "NitroStorageCache";

  constructor(private readonly defaultTtlSeconds = 3600) {
    super();
  }

  strategy(): "explicit" | "all" {
    return "explicit";
  }

  override async get(
    key: string,
    _tables: string[],
    isTag = false,
    isAutoInvalidate = true,
  ): Promise<unknown[] | undefined> {
    try {
      const redis = useStorage("redis");

      if (!isAutoInvalidate) {
        const value = await redis.getItem<unknown[]>(`${NON_AUTO_PREFIX}${key}`);
        return value ?? undefined;
      }

      if (isTag) {
        const mappedKey = await redis.getItem<string>(`${TAG_MAP_PREFIX}${key}`);
        if (!mappedKey) return undefined;
        const value = await redis.getItem<unknown[]>(mappedKey);
        return value ?? undefined;
      }

      const value = await redis.getItem<unknown[]>(queryKey(key));
      return value ?? undefined;
    } catch (error) {
      logCacheError("get", error);
      return undefined;
    }
  }

  override async put(
    key: string,
    response: unknown,
    tables: string[],
    isTag = false,
    config?: CacheConfig,
  ): Promise<void> {
    try {
      const redis = useStorage("redis");
      const ttl = resolveTtlSeconds(config, this.defaultTtlSeconds);
      const opts = { ttl };
      const isAutoInvalidate = tables.length > 0;
      const valueKey = isAutoInvalidate ? queryKey(key) : `${NON_AUTO_PREFIX}${key}`;

      await redis.setItem(valueKey, response, opts);

      if (isTag) {
        await redis.setItem(`${TAG_MAP_PREFIX}${key}`, valueKey, opts);
      }

      if (!isAutoInvalidate) return;

      // One index key per (table, query hash) — concurrent puts cannot clobber each other.
      await Promise.all(
        tables.map((table) => redis.setItem(tableIndexKey(table, key), true, opts)),
      );
    } catch (error) {
      logCacheError("put", error);
    }
  }

  override async onMutate(params: MutationOption): Promise<void> {
    try {
      const redis = useStorage("redis");

      const tags = params.tags
        ? Array.isArray(params.tags)
          ? params.tags
          : [params.tags]
        : [];

      const tables = params.tables
        ? Array.isArray(params.tables)
          ? params.tables
          : [params.tables]
        : [];

      for (const tag of tags) {
        const mappedKey = await redis.getItem<string>(`${TAG_MAP_PREFIX}${tag}`);
        if (mappedKey) await redis.removeItem(mappedKey);
        await redis.removeItem(`${TAG_MAP_PREFIX}${tag}`);
      }

      for (const table of tables) {
        const tableName = is(table, Table) ? table[OriginalName] : (table as string);
        const prefix = tableIndexPrefix(tableName);
        const indexKeys = await redis.getKeys(prefix);

        await Promise.all(
          indexKeys.map(async (indexKey) => {
            const queryHash = indexKey.startsWith(prefix)
              ? indexKey.slice(prefix.length)
              : indexKey;
            await redis.removeItem(queryKey(queryHash));
            await redis.removeItem(indexKey);
          }),
        );
      }
    } catch (error) {
      logCacheError("onMutate", error);
    }
  }
}

export function isDrizzleCacheEnabled(): boolean {
  return process.env.QUERY_CACHE !== "0" && process.env.QUERY_CACHE !== "false";
}

export function createNitroStorageCache(): NitroStorageCache {
  const defaultTtl = Number(process.env.DRIZZLE_CACHE_DEFAULT_TTL ?? 3600);
  return new NitroStorageCache(defaultTtl);
}
