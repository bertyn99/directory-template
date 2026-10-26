/**
 * Compare drizzle.__drizzle_migrations with local v3 folder migrations.
 *
 * Orphan DB rows (wrong hash / duplicates from old journal repairs) block
 * `drizzle-kit migrate` during the v0→v1 migrations-table upgrade.
 *
 * Usage:
 *   pnpm exec tsx scripts/reconcile-migrations.ts        # dry-run
 *   pnpm exec tsx scripts/reconcile-migrations.ts --fix # delete orphans, then pnpm db:migrate
 */
import { readMigrationFiles } from "drizzle-orm/migrator";
import { loadEnvFile } from "./load-env";
import pg from "pg";

loadEnvFile();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function bucketMillis(createdAt: string | number): number {
  const stringified = String(createdAt);
  return Number(stringified.slice(0, stringified.length - 3) + "000");
}

async function main() {
  const local = readMigrationFiles({ migrationsFolder: "server/db/migrations" });
  local.sort((a, b) =>
    a.folderMillis !== b.folderMillis
      ? a.folderMillis - b.folderMillis
      : a.name.localeCompare(b.name),
  );

  const byMillis = new Map<number, typeof local>();
  const byHash = new Map<string, (typeof local)[number]>();
  for (const lm of local) {
    if (!byMillis.has(lm.folderMillis)) byMillis.set(lm.folderMillis, []);
    byMillis.get(lm.folderMillis)!.push(lm);
    byHash.set(lm.hash, lm);
  }

  const { rows: dbRows } = await pool.query<{
    id: number;
    hash: string;
    created_at: string;
  }>("SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id");

  const matched = new Map<string, number>();
  const orphans: typeof dbRows = [];
  const orphanIds: number[] = [];

  for (const row of dbRows) {
    const millis = bucketMillis(row.created_at);
    const candidates = byMillis.get(millis);
    let lm: (typeof local)[number] | undefined;
    if (candidates?.length === 1) lm = candidates[0];
    else if (candidates && candidates.length > 1) {
      lm = candidates.find((c) => c.hash === row.hash);
    } else {
      lm = byHash.get(row.hash);
    }

    if (!lm) {
      orphans.push(row);
      orphanIds.push(row.id);
      continue;
    }

    const key = lm.name;
    if (matched.has(key)) {
      orphans.push(row);
      orphanIds.push(row.id);
      console.log(`duplicate for ${key}: keeping id ${matched.get(key)}, orphan id ${row.id}`);
    } else {
      matched.set(key, row.id);
      console.log(`ok id ${row.id} -> ${lm.name}`);
    }
  }

  const pending = local.filter((lm) => !matched.has(lm.name));
  console.log("\n--- orphans ---");
  for (const o of orphans) console.log(o);
  console.log("\n--- pending local (not in DB) ---");
  for (const p of pending) console.log(p.name, p.hash);

  const apply = process.argv.includes("--fix");
  if (apply && orphanIds.length > 0) {
    await pool.query(
      "DELETE FROM drizzle.__drizzle_migrations WHERE id = ANY($1::int[])",
      [orphanIds],
    );
    console.log(`\nDeleted ${orphanIds.length} orphan row(s): ${orphanIds.join(", ")}`);
    console.log("Run: pnpm db:migrate");
  } else if (orphanIds.length > 0) {
    console.log("\nRe-run with --fix to delete orphan rows, then pnpm db:migrate");
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
