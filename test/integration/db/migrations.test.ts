import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import {
  closePgliteTestDb,
  createPgliteTestDb,
  truncateAll,
} from '../../setup/pglite-db'

let pglite: PGlite

beforeAll(async () => {
  const handle = await createPgliteTestDb()
  pglite = handle.pglite
})

afterAll(async () => {
  await closePgliteTestDb(pglite)
})

afterEach(async () => {
  await truncateAll(pglite)
})

describe('production migration chain replay', () => {
  it('installs every extension the chain declares', async () => {
    const { rows } = await pglite.query<{ extname: string }>(
      `SELECT extname FROM pg_extension
       WHERE extname IN ('pg_trgm', 'unaccent', 'pgcrypto')
       ORDER BY extname`,
    )
    expect(rows.map(r => r.extname)).toEqual(['pg_trgm', 'pgcrypto', 'unaccent'])
  })

  it('recreates the trigram GIST index backing venue search', async () => {
    const { rows } = await pglite.query<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef FROM pg_indexes WHERE indexname = 'venue_normalized_name_trgm_idx'`,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].indexdef).toContain('gist_trgm_ops')
  })

  it('installs the slugify() function used by generated columns', async () => {
    const { rows } = await pglite.query<{ slugify: string }>(
      `SELECT public.slugify('Café Thaï') AS slugify`,
    )
    expect(rows[0].slugify).toBe('cafe-thai')
  })

  it('auto-generates venue slugs through slugify()', async () => {
    const { rows } = await pglite.query<{ slug: string }>(
      `INSERT INTO venues (name) VALUES ('Paris Fight Gym') RETURNING slug`,
    )
    expect(rows[0].slug).toBe('paris-fight-gym')
  })
})
