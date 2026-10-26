// Embedded PostgreSQL fixture for DB-layer integration tests.
//
// One PGlite instance per test FILE keeps isolation simple; between tests,
// wipe rows with truncateAll(). The REAL production migration chain from
// server/db/migrations is replayed verbatim, so schema architecture
// (extensions, generated columns, trigram indexes) is exercised as shipped.
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { unaccent } from '@electric-sql/pglite/contrib/unaccent'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { relations } from '../../server/db/schemas/relations'
import {
  resetDrizzleInstance,
  setDrizzleInstance,
} from '../../server/utils/drizzle'

const MIGRATIONS_FOLDER = fileURLToPath(
  new URL('../../server/db/migrations', import.meta.url),
)

const NIL_UUID = '00000000-0000-0000-0000-000000000000'

/**
 * Relative order for the snapshot-degenerate 20260528140140_* cluster
 * (see chainOrderedNames for why the chain cannot order them itself).
 */
const DEGENERATE_CLUSTER_ORDER = [
  '20260528140140_activity_locale_slugs',
  '20260528140140_backfill_activity_slugs',
  '20260528140140_merge_duplicate_activities',
  '20260528140140_activities_slugs_gin_index',
]

/**
 * Recover drizzle-kit's canonical order from the snapshot.json parent chain
 * (id + prevIds[]). Directory names are unusable for ordering: six folders
 * share timestamp 20260528140140 alone.
 */
function chainOrderedNames(): string[] {
  const dirs = readdirSync(MIGRATIONS_FOLDER).filter(dir =>
    existsSync(join(MIGRATIONS_FOLDER, dir, 'migration.sql')),
  )

  const parentsOf = new Map<string, string[]>()
  const idOf = new Map<string, string>()
  for (const dir of dirs) {
    const snap = JSON.parse(
      readFileSync(join(MIGRATIONS_FOLDER, dir, 'snapshot.json'), 'utf8'),
    ) as { id: string; prevIds?: string[] }
    if (!parentsOf.has(dir)) {
      idOf.set(dir, snap.id)
      parentsOf.set(
        dir,
        (snap.prevIds ?? []).filter(id => id !== NIL_UUID),
      )
    }
  }

  const knownIds = new Set(idOf.values())

  const known = new Set(parentsOf.keys())

  // Kahn topological sort over the parent graph. Six folders branch/merge,
  // so this is a DAG — no linear walk can cover it. Ready nodes tie-break on
  // directory name for reproducibility.
  const ready = [...parentsOf.entries()]
    .filter(([, parents]) => parents.length === 0 || !parents.every(p => knownIds.has(p)))
    .map(([name]) => name)
    .sort()
  if (ready.length !== 1) {
    throw new Error(
      `Cannot resolve a single migration chain root in ${MIGRATIONS_FOLDER}; found: ${ready.join(', ')}`,
    )
  }

  const childrenOf = new Map<string, string[]>()
  for (const [name, parents] of parentsOf) {
    for (const parent of parents) {
      childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), name])
    }
  }
  const pendingParents = new Map<string, number>()
  for (const [name, parents] of parentsOf) {
    pendingParents.set(name, parents.filter(p => knownIds.has(p)).length)
  }

  const ordered: string[] = []
  let frontier = ready
  while (frontier.length > 0) {
    frontier.sort()
    const next: string[] = []
    for (const name of frontier) {
      ordered.push(name)
      for (const child of childrenOf.get(idOf.get(name) ?? '') ?? []) {
        const left = (pendingParents.get(child) ?? 1) - 1
        pendingParents.set(child, left)
        if (left === 0) next.push(child)
      }
    }
    frontier = next
  }

  const orphaned = [...known].filter(name => !ordered.includes(name))
  if (orphaned.length > 0) {
    throw new Error(`Migration folders outside the snapshot chain: ${orphaned.join(', ')}`)
  }

  // The 20260528140140_* cluster is degenerate: its snapshots share one id
  // and one prevIds entry, so the parent chain carries no ordering among
  // them and a from-zero replay falls back to alphabetical order. That puts
  // the GIN index before the `slugs` column exists (42703).
  //
  // Explicit order from SQL dependencies:
  //   1. activity_locale_slugs   adds `slug` (plain) + `slugs` jsonb
  //   2. backfill_activity_slugs fills `slugs` for ids 1–35
  //   3. merge_duplicate_activities dedups; its `slugs->>'x' IS NULL`
  //      guards make it idempotent after the backfill
  //   4. activities_slugs_gin_index  indexes `slugs`, last
  // (history_stats_faqs and standardize_countries are independent of these.)
  const clusterRank = new Map(
    DEGENERATE_CLUSTER_ORDER.map((name, i) => [name, i] as const),
  )
  // Stable sort: only reorders members of the cluster relative to each other.
  ordered.sort((a, b) => {
    const ra = clusterRank.get(a)
    const rb = clusterRank.get(b)
    if (ra !== undefined && rb !== undefined) return ra - rb
    return 0
  })

  return ordered
}

/**
 * Replays the production chain through PGlite's simple protocol.
 *
 * Parsing stays first-party (readMigrationFiles: same statement splitting and
 * hashes); execution bypasses `drizzle-orm/pglite`'s session migrator because
 * its extended protocol forbids multi-command batches such as CREATE EXTENSION
 * followed by $function$ bodies (42601). Journal bookkeeping mirrors upstream
 * defaults (drizzle.__drizzle_migrations).
 */
async function applyMigrations(pglite: PGlite): Promise<void> {
  const rank = new Map(chainOrderedNames().map((name, i) => [name, i]))
  const migrations = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER })
    .sort((a, b) => (rank.get(a.name) ?? 0) - (rank.get(b.name) ?? 0))

  await pglite.exec(
    'CREATE SCHEMA IF NOT EXISTS drizzle;'
    + 'CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations ('
    + ' id serial primary key,'
    + ' hash text not null,'
    + ' created_at bigint,'
    + ' name text);'
  )

  const { rows: applied } = await pglite.query<{ hash: string }>(
    'SELECT hash FROM drizzle.__drizzle_migrations',
  )
  const seen = new Set(applied.map(r => r.hash))

  for (const migration of migrations) {
    if (seen.has(migration.hash)) continue

    if (process.env.DB_MIGRATIONS_TRACE === '1') {
      console.error(`[db-migrate] ${migration.name}`)
    }

    for (const patchStmt of PRE_MIGRATION_PATCHES[migration.name] ?? []) {
      await pglite.exec(patchStmt)
    }
    for (const stmt of migration.sql) {
      const trimmed = stmt.trim()
      if (trimmed.length > 0) await pglite.exec(trimmed)
    }

    await pglite.exec(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at, name)`
      + ` VALUES ('${migration.hash.replace(/'/g, "''")}', ${migration.folderMillis}, null)`,
    )
  }
}

/**
 * Boot an in-memory PostgreSQL wired through the app's injection seam.
 *
 * The keys of `extensions` MUST match SQL extension names so the
 * CREATE EXTENSION statements in the migration chain resolve.
 */
export async function createPgliteTestDb() {
  const pglite = new PGlite({
    extensions: { pg_trgm, unaccent, pgcrypto },
  })
  const db = drizzlePglite({ client: pglite, relations })

  await applyMigrations(pglite)

  // Route production query functions (server/db/queries/*) to this instance.
  setDrizzleInstance(db)

  return { pglite, db }
}

/** Detach the singleton before dropping the embedded database. */
export async function closePgliteTestDb(pglite: PGlite): Promise<void> {
  resetDrizzleInstance()
  await pglite.close()
}

/** Wipe every public table between tests (schema and migration bookkeeping survive). */
export async function truncateAll(pglite: PGlite): Promise<void> {
  await pglite.exec(`
    DO $$
    DECLARE tbl text;
    BEGIN
      FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', tbl);
      END LOOP;
    END $$;
  `)
}

/**
 * Prologue statements attached to specific migrations before their own SQL.
 *
 * CHAIN DRIFT FOUND BY THIS HARNESS: 20260519151850_seed_activities_27_to_35
 * writes explicit slug values into activities.slug while the chain still has
 * it GENERATED ALWAYS (set by 20240830101440_absurd_namor +
 * 20240905215646_groovy_inertia; only reverted later by
 * 20260528140140_activity_locale_slugs). That INSERT is illegal against a
 * stored-generated column even on native Postgres, so this migration cannot
 * replay from zero anywhere — production evidently received the rows manually.
 * The patch lifts generation right before the seed and lets the later revert
 * own the final shape/uniqueness.
 */
const PRE_MIGRATION_PATCHES: Record<string, string[]> = {
  '20260519151850_seed_activities_27_to_35': [
    'ALTER TABLE "activities" DROP COLUMN "slug"',
    'ALTER TABLE "activities" ADD COLUMN "slug" varchar(255)',
    `UPDATE "activities" SET "slug" = lower("name" || '-' || "id")`,
  ],
}
