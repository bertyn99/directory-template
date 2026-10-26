// test/setup/db.ts
// Setup for integration tests that need a real PostgreSQL test database.
// Uses transaction rollback for test isolation — each test runs in a
// transaction that rolls back afterward, so data never persists.
import { beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import pg from "pg";

const { Pool, Client } = pg;

let pool: pg.Pool;
let client: pg.Client;

beforeEach(async () => {
  await beginTransaction();
});

beforeAll(async () => {
  const connectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("TEST_DATABASE_URL or DATABASE_URL must be set for integration tests");
  }

  // Create a pool for general queries
  pool = new Pool({ connectionString, max: 5 });
  client = new Client({ connectionString });
  await client.connect();

  // Verify connection
  await client.query("SELECT 1");
});

afterEach(async () => {
  // Rollback any open transaction
  try {
    await client.query("ROLLBACK");
  } catch {
    // No transaction to rollback — fine
  }
});

afterAll(async () => {
  await client.end();
  await pool.end();
});

/**
 * Start a transaction for test isolation.
 * Call this at the start of each test that modifies data.
 */
export async function beginTransaction() {
  await client.query("BEGIN");
  return client;
}

/**
 * Rollback the current transaction.
 * Called automatically in afterEach, but can be called manually.
 */
export async function rollbackTransaction() {
  await client.query("ROLLBACK");
}

/**
 * Helper to seed test data and get it back.
 * Usage: const [user] = await seed(db.insert(users).values({...}).returning())
 */
export async function seed<T>(query: Promise<T[]>, rollback = true): Promise<T> {
  if (rollback) await beginTransaction();
  const results = await query;
  return results[0];
}
