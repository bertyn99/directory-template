# DB-Lane Integration Tests (embedded PGlite)

Exercise backend infrastructure without a live Postgres server or Nitro process.

Each spec boots its own in-memory PGlite instance via `test/setup/pglite-db.ts`,
which replays the REAL production migration chain (`server/db/migrations`), so the
schema under test — extensions (`unaccent`, `pg_trgm`, `pgcrypto`), generated slug
columns, trigram GIST index, FK behaviors — is exactly what ships.

```bash
pnpm test:integration            # correctness lane
DB_PERF=1 pnpm test:integration  # + indicative performance smoke
```

Performance numbers printed by `perf.smoke.test.ts` are **indicative only**
(single connection, WASM CPU-bound). Native benchmarking against real
PostgreSQL belongs to `scripts/bench-queries.ts` (`pnpm bench:queries`).
