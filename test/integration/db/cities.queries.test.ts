import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { getCountryByCitySlug } from '../../../server/db/queries/cities'
import {
  closePgliteTestDb,
  createPgliteTestDb,
  truncateAll,
} from '../../setup/pglite-db'
import { seedCity, seedCountry } from '../db/factories'

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

describe('getCountryByCitySlug (GET /api/cities/resolve backing query)', () => {
  it('resolves a name slug to its country slug + canonical city name', async () => {
    await seedCountry(db, 'FR', 'France')
    await seedCity(db, { name: 'Paris', zip: '75001', countryCode: 'FR' })

    const resolved = await getCountryByCitySlug('paris')

    expect(resolved).not.toBeNull()
    expect(resolved?.slug).toBe('france')
    expect(resolved?.code).toBe('FR')
    expect(resolved?.name).toBe('France')
    expect(resolved?.cityName).toBe('Paris')
  })

  it('resolves alias slugs (lisboa → Lisbon) through the catalog alias map', async () => {
    await seedCountry(db, 'PT', 'Portugal')
    await seedCity(db, { name: 'Lisbon', zip: '1000', countryCode: 'PT' })

    const resolved = await getCountryByCitySlug('lisboa')

    expect(resolved?.slug).toBe('portugal')
    expect(resolved?.cityName).toBe('Lisbon')
  })

  it('returns null for an unknown city (middleware skips the redirect)', async () => {
    expect(await getCountryByCitySlug('atlantis')).toBeNull()
  })
})
