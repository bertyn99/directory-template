import { loadEnvFile } from "./load-env";
import pg from "pg";

loadEnvFile();

const TABLES = [
  "venues",
  "addresses",
  "cities",
  "countries",
  "venue_activities",
  "activities",
  "formulas",
  "reviews",
] as const;

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const list = TABLES.map((t) => `"${t}"`).join(", ");
  await pool.query(`ANALYZE ${list}`);
  console.log(`ANALYZE complete: ${TABLES.join(", ")}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
