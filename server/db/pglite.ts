/**
 * Embedded PostgreSQL (PGlite) — the template's zero-config database default.
 *
 * When `DATABASE_URL` is not set, the app (server/plugins/db-default-pglite.ts)
 * and the seed script boot a PERSISTENT PGlite database at `.data/pglite`
 * instead of a pg.Pool: clone → `pnpm dev` → working directory with sample
 * data, no external Postgres required. Real deployments set DATABASE_URL and
 * this module is never loaded.
 *
 * The migration replay is the REAL production chain from server/db/migrations,
 * lifted verbatim from the integration-test harness (test/setup/pglite-db.ts):
 * drizzle-kit cannot order the degenerate 20260528140140_* cluster by folder
 * name, and one legacy migration cannot replay from zero anywhere without a
 * documented patch — see the comments on chainOrderedNames and
 * PRE_MIGRATION_PATCHES below.
 */
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { relations } from "./schemas/relations";
import { setDrizzleInstance } from "../utils/drizzle";

/** Default on-disk location of the embedded database (gitignored via .data). */
export const PGLITE_DATA_DIR = ".data/pglite";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

function migrationsFolder(): string {
  // Dev + build sandbox: cwd is the project root. Production (node .output)
  // has no migrations folder on disk — embedded mode is a dev default there;
  // the caller surfaces a clear error on a fresh database.
  return process.env.PGLITE_MIGRATIONS_DIR ?? resolve(process.cwd(), "server/db/migrations");
}

/**
 * Relative order for the snapshot-degenerate 20260528140140_* cluster
 * (see chainOrderedNames for why the chain cannot order them itself).
 */
const DEGENERATE_CLUSTER_ORDER = [
  "20260528140140_activity_locale_slugs",
  "20260528140140_backfill_activity_slugs",
  "20260528140140_merge_duplicate_activities",
  "20260528140140_activities_slugs_gin_index",
];

/**
 * Recover drizzle-kit's canonical order from the snapshot.json parent chain
 * (id + prevIds[]). Directory names are unusable for ordering: six folders
 * share timestamp 20260528140140 alone.
 */
function chainOrderedNames(folder: string): string[] {
  const dirs = readdirSync(folder).filter(dir =>
    existsSync(join(folder, dir, "migration.sql")),
  );

  const parentsOf = new Map<string, string[]>();
  const idOf = new Map<string, string>();
  for (const dir of dirs) {
    const snap = JSON.parse(
      readFileSync(join(folder, dir, "snapshot.json"), "utf8"),
    ) as { id: string; prevIds?: string[] };
    if (!parentsOf.has(dir)) {
      idOf.set(dir, snap.id);
      parentsOf.set(
        dir,
        (snap.prevIds ?? []).filter(id => id !== NIL_UUID),
      );
    }
  }

  const knownIds = new Set(idOf.values());

  const known = new Set(parentsOf.keys());

  // Kahn topological sort over the parent graph. Six folders branch/merge,
  // so this is a DAG — no linear walk can cover it. Ready nodes tie-break on
  // directory name for reproducibility.
  const ready = [...parentsOf.entries()]
    .filter(([, parents]) => parents.length === 0 || !parents.every(p => knownIds.has(p)))
    .map(([name]) => name)
    .sort();
  if (ready.length !== 1) {
    throw new Error(
      `Cannot resolve a single migration chain root in ${folder}; found: ${ready.join(", ")}`,
    );
  }

  const childrenOf = new Map<string, string[]>();
  for (const [name, parents] of parentsOf) {
    for (const parent of parents) {
      childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), name]);
    }
  }
  const pendingParents = new Map<string, number>();
  for (const [name, parents] of parentsOf) {
    pendingParents.set(name, parents.filter(p => knownIds.has(p)).length);
  }

  const ordered: string[] = [];
  let frontier = ready;
  while (frontier.length > 0) {
    frontier.sort();
    const next: string[] = [];
    for (const name of frontier) {
      ordered.push(name);
      for (const child of childrenOf.get(idOf.get(name) ?? "") ?? []) {
        const left = (pendingParents.get(child) ?? 1) - 1;
        pendingParents.set(child, left);
        if (left === 0) next.push(child);
      }
    }
    frontier = next;
  }

  const orphaned = [...known].filter(name => !ordered.includes(name));
  if (orphaned.length > 0) {
    throw new Error(`Migration folders outside the snapshot chain: ${orphaned.join(", ")}`);
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
  );
  // Stable sort: only reorders members of the cluster relative to each other.
  ordered.sort((a, b) => {
    const ra = clusterRank.get(a);
    const rb = clusterRank.get(b);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    return 0;
  });

  return ordered;
}

/**
 * Prologue statements attached to specific migrations before their own SQL.
 *
 * CHAIN DRIFT: 20260519151850_seed_activities_27_to_35 writes explicit slug
 * values into activities.slug while the chain still has it GENERATED ALWAYS
 * (set by 20240830101440_absurd_namor + 20240905215646_groovy_inertia; only
 * reverted later by 20260528140140_activity_locale_slugs). That INSERT is
 * illegal against a stored-generated column even on native Postgres, so this
 * migration cannot replay from zero anywhere — production evidently received
 * the rows manually. The patch lifts generation right before the seed and
 * lets the later revert own the final shape/uniqueness.
 */
const PRE_MIGRATION_PATCHES: Record<string, string[]> = {
  "20260519151850_seed_activities_27_to_35": [
    'ALTER TABLE "activities" DROP COLUMN "slug"',
    'ALTER TABLE "activities" ADD COLUMN "slug" varchar(255)',
    `UPDATE "activities" SET "slug" = lower("name" || '-' || "id")`,
  ],
};

/**
 * Replays the production chain through PGlite's simple protocol.
 *
 * Parsing stays first-party (readMigrationFiles: same statement splitting and
 * hashes); execution bypasses `drizzle-orm/pglite`'s session migrator because
 * its extended protocol forbids multi-command batches such as CREATE EXTENSION
 * followed by $function$ bodies (42601). Journal bookkeeping mirrors upstream
 * defaults (drizzle.__drizzle_migrations). Idempotent: applied hashes are
 * skipped, so booting an existing data directory only applies new migrations.
 */
export async function applyPgliteMigrations(pglite: PGlite): Promise<void> {
  const folder = migrationsFolder();
  if (!existsSync(folder)) {
    throw new Error(
      `Embedded database migrations not found at ${folder}. Embedded PGlite mode is a dev default — set DATABASE_URL for production, or run from the project root.`,
    );
  }

  const rank = new Map(chainOrderedNames(folder).map((name, i) => [name, i]));
  const migrations = readMigrationFiles({ migrationsFolder: folder })
    .sort((a, b) => (rank.get(a.name) ?? 0) - (rank.get(b.name) ?? 0));

  await pglite.exec(
    "CREATE SCHEMA IF NOT EXISTS drizzle;"
    + "CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations ("
    + " id serial primary key,"
    + " hash text not null,"
    + " created_at bigint,"
    + " name text);",
  );

  const { rows: applied } = await pglite.query<{ hash: string }>(
    "SELECT hash FROM drizzle.__drizzle_migrations",
  );
  const seen = new Set(applied.map(r => r.hash));

  for (const migration of migrations) {
    if (seen.has(migration.hash)) continue;

    for (const patchStmt of PRE_MIGRATION_PATCHES[migration.name] ?? []) {
      await pglite.exec(patchStmt);
    }
    for (const stmt of migration.sql) {
      const trimmed = stmt.trim();
      if (trimmed.length > 0) await pglite.exec(trimmed);
    }

    await pglite.exec(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at, name)`
      + ` VALUES ('${migration.hash.replace(/'/g, "''")}', ${migration.folderMillis}, null)`,
    );
  }
}

/**
 * Boot an embedded PostgreSQL wired through the app's injection seam
 * (setDrizzleInstance — server/db/queries/* then run against it unchanged).
 *
 * `dataDir` undefined ⇒ in-memory (the integration-test default); a path ⇒
 * persistent (the app/seed default, `.data/pglite`). The extension keys MUST
 * match SQL extension names so the CREATE EXTENSION statements in the
 * migration chain resolve.
 */
export async function createAppPglite(
  dataDir?: string,
): Promise<{ pglite: PGlite; db: PgliteDatabase<typeof relations> }> {
  const pglite = new PGlite({
    dataDir,
    extensions: { pg_trgm, unaccent, pgcrypto },
  });
  const db = drizzlePglite({ client: pglite, relations });

  await applyPgliteMigrations(pglite);

  // Route the app's query functions (server/db/queries/*) to this instance —
  // the same injection seam the integration tests use.
  setDrizzleInstance(db);

  return { pglite, db };
}
