import { createAppPglite, PGLITE_DATA_DIR } from "~~/server/db/pglite";

/**
 * Zero-config database default (template mode): with no DATABASE_URL the app
 * boots an embedded, PERSISTENT PGlite database at .data/pglite and replays
 * the full migration chain (server/db/pglite.ts). Query code is untouched —
 * the Drizzle instance is injected through the same seam the tests use.
 *
 * Real deployments set DATABASE_URL and this plugin is a no-op — useDrizzle()
 * pools the remote Postgres as before.
 */
export default defineNitroPlugin(async () => {
  if (process.env.DATABASE_URL) return;

  console.log(
    `[db] No DATABASE_URL — using the embedded PGlite database (persistent, .data/pglite). Set DATABASE_URL to use a real Postgres.`,
  );

  await createAppPglite(PGLITE_DATA_DIR);
});
