// INDICATIVE performance smoke under embedded Postgres.
//
// Run explicitly: DB_PERF=1 pnpm test:integration
//
// Numbers describe WASM-single-connection throughput only — they catch gross
// regressions (missing index, accidental N+1 shape) but are NOT native-Postgres
// latency. For pool-backed baselines use scripts/bench-queries.ts.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { venues } from '../../../server/db/schemas'
import { searchVenues } from '../../../server/db/queries/venues'
import {
  closePgliteTestDb,
  createPgliteTestDb,
  truncateAll,
} from '../../setup/pglite-db'

const ENABLED = process.env.DB_PERF === '1'
const CORPUS_SIZE = 400
const ITERATIONS = 40

const NAME_WORDS = ['Fitness', 'Yoga', 'Spa', 'Swim', 'Climb', 'Académie']
const SEARCH_TERMS = ['fitness', 'yoga', 'spa', 'swim', 'climb']

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p))
  return sorted[idx]
}

let pglite: PGlite
let db: Awaited<ReturnType<typeof createPgliteTestDb>>['db']

beforeAll(async () => {
  const handle = await createPgliteTestDb()
  pglite = handle.pglite
  db = handle.db
})

afterAll(async () => {
  await closePgliteTestDb(pglite)
})

afterEach(async () => {
  await truncateAll(pglite)
})

describe.skipIf(!ENABLED)('indicative search latency on seeded corpus', () => {
  it(`runs trigram/ILIKE search over ${CORPUS_SIZE} venues without gross regressions`, async () => {
    for (let start = 0; start < CORPUS_SIZE; start += 100) {
      const chunk = Array.from({ length: Math.min(100, CORPUS_SIZE - start) }, (_, i) => {
        const n = start + i
        const name = `${NAME_WORDS[n % NAME_WORDS.length]} ${n}`
        return { name, normalizedName: name.toLowerCase() }
      })
      await db.insert(venues).values(chunk)
    }

    const durations: number[] = []
    for (let i = 0; i < ITERATIONS; i++) {
      const term = SEARCH_TERMS[i % SEARCH_TERMS.length]
      const startedAt = performance.now()
      const res = await searchVenues({ search: term })
      durations.push(performance.now() - startedAt)
      expect(res.venues.length).toBeGreaterThan(0)
    }

    durations.sort((a, b) => a - b)
    const p50 = percentile(durations, 0.5)
    const p95 = percentile(durations, 0.95)

     
    console.table([
      { metric: 'p50_ms', value: Number(p50.toFixed(2)) },
      { metric: 'p95_ms', value: Number(p95.toFixed(2)) },
      { metric: 'iterations', value: ITERATIONS },
      { metric: 'corpus', value: CORPUS_SIZE },
    ])

    // Sanity bound only — absence of structural disasters, not a native SLA.
    expect(p95).toBeLessThan(5000)
  }, 120_000)
})
