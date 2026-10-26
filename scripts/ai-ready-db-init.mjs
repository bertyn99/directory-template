/**
 * Bootstrap the nuxt-ai-ready SQLite database schema.
 *
 * nuxt-ai-ready (v1.8.0) never creates its tables on a fresh install:
 * its cron/status paths query `ai_ready_pages` / `_ai_ready_info` directly
 * and 500 with "no such table" before any initSchema() runs. Building the
 * schema here (post-build) means the runtime always starts with a ready DB.
 *
 * Idempotent: CREATE TABLE IF NOT EXISTS + upsert of the schema version.
 * If the installed module's schema version changes, its own initSchema()
 * drop/recreate logic still self-heals later.
 *
 * Usage: wired into the `build` npm script (runs after `nuxt build`).
 */
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, "../.data/ai-ready/pages.db");
const SCHEMA_MODULE = resolve(
  __dirname,
  "../node_modules/nuxt-ai-ready/dist/runtime/server/db/schema-sql.js",
);

// Must match the SCHEMA_VERSION constant in
// node_modules/nuxt-ai-ready/dist/runtime/server/db/drizzle/queries.js
const SCHEMA_VERSION = "v2.2.0-drizzle";
const FTS_TOKENIZER = "unicode61 remove_diacritics 2";

const { buildSchemaSql, SCHEMA_VERSION: moduleSchemaVersion } = await import(
  SCHEMA_MODULE
);

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

for (const statement of buildSchemaSql()) {
  db.exec(statement);
}

const upsert = db.prepare(
  `INSERT INTO _ai_ready_info (id, value, version) VALUES (?, ?, ?)
   ON CONFLICT(id) DO UPDATE SET value = excluded.value, version = excluded.version`,
);

upsert.run("schema", null, SCHEMA_VERSION);
upsert.run("fts_tokenizer", FTS_TOKENIZER, null);

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
  .all()
  .map((row) => row.name)
  .join(", ");

console.log(
  `[ai-ready-db-init] ready: ${DB_PATH}\n`
  + `[ai-ready-db-init] tables: ${tables}\n`
  + `[ai-ready-db-init] schema version: ${SCHEMA_VERSION}`
  + (moduleSchemaVersion ? ` (module DDL v${moduleSchemaVersion})` : ""),
);

db.close();
