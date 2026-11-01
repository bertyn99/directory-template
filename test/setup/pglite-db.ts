// Embedded PostgreSQL fixture for DB-layer integration tests.
//
// One PGlite instance per test FILE keeps isolation simple; between tests,
// wipe rows with truncateAll(). The REAL production migration chain from
// server/db/migrations is replayed verbatim, so schema architecture
// (extensions, generated columns, trigram indexes) is exercised as shipped.
//
// The replay machinery (chain ordering, patches, extensions) lives in
// server/db/pglite.ts — shared with the app's zero-config boot
// (server/plugins/db-default-pglite.ts) and the seed script. Tests pass no
// dataDir ⇒ in-memory; the app passes `.data/pglite` ⇒ persistent.
import type { PGlite } from '@electric-sql/pglite'
import { createAppPglite } from '../../server/db/pglite'
import {
  resetDrizzleInstance,
} from '../../server/utils/drizzle'

/** In-memory embedded database with the full migration chain applied. */
export async function createPgliteTestDb() {
  return createAppPglite(undefined)
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
