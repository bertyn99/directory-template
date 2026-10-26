import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { searchVenues } from '../../../server/db/queries/venues'
import {
  closePgliteTestDb,
  createPgliteTestDb,
  truncateAll,
} from '../../setup/pglite-db'
import {
  linkVenueActivity,
  seedActivity,
  seedAddress,
  seedCity,
  seedVenue,
} from '../db/factories'

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

describe('searchVenues against the production schema', () => {
  it('matches typo’d names exclusively through the trigram branch', async () => {
    // Term drops a letter AND loses its space, so %name% ILIKE cannot hit —
    // any result must come from normalizedName % term.
    const krack = await seedVenue(db, {
      name: 'Krach Fit Paris',
      normalizedName: 'krach fit paris',
    })
    await seedVenue(db, { name: 'Calm Corner Lyon' })

    const res = await searchVenues({ search: 'krachfit paris' })

    expect(res.venues.map(c => c.id)).toEqual([krack.id])
    expect(res.totalCount).toBe(1)
  })

  it('falls back to ILIKE when normalizedName is null', async () => {
    const champ = await seedVenue(db, {
      name: 'Champion Academy',
      normalizedName: null,
    })

    const res = await searchVenues({ search: 'champion acade' })

    expect(res.venues.map(c => c.id)).toEqual([champ.id])
  })

  it('never returns non-active venues even on strong matches', async () => {
    const active = await seedVenue(db, { name: 'Alpha Gym' })
    await seedVenue(db, { name: 'Beta Gym', statusCode: 'closed' })

    const res = await searchVenues({ search: 'gym' })

    expect(res.venues.map(c => c.id)).toEqual([active.id])
  })

  it('applies country filtering through address → city → country and paginates', async () => {
    const lyon = await seedCity(db, { name: 'Lyon', zip: '69001' })
    for (let i = 0; i < 3; i++) {
      const addr = await seedAddress(db, { cityId: lyon.id })
      await seedVenue(db, { name: `Lyon Gym ${i + 1}`, addressId: addr.id })
    }

    const madrid = await seedCity(db, { name: 'Madrid', zip: '28001', countryCode: 'ES' })
    const madAddr = await seedAddress(db, { cityId: madrid.id })
    await seedVenue(db, { name: 'Madrid Mat Venue', addressId: madAddr.id })

    const page2 = await searchVenues({ countryCode: 'FR', pageSize: 2, page: 2 })

    expect(page2.totalCount).toBe(3)
    expect(page2.totalPages).toBe(2)
    expect(page2.page).toBe(2)
    expect(page2.venues).toHaveLength(1)
    expect(page2.venues[0].address?.city.name).toBe('Lyon')

    const byZip = await searchVenues({ zip: '28001' })
    expect(byZip.venues.map(c => c.name)).toEqual(['Madrid Mat Venue'])
  })

  it('filters on linked activities and returns nothing for unknown ids', async () => {
    const act = await seedActivity(db, 'yoga')
    const linked = await seedVenue(db, { name: 'Yoga House' })
    await seedVenue(db, { name: 'No Link Venue' })
    await linkVenueActivity(db, linked.id, act.id)

    const hits = await searchVenues({ activityIds: [act.id] })
    expect(hits.venues.map(c => c.id)).toEqual([linked.id])

    const none = await searchVenues({ activityIds: [act.id + 999_999] })
    expect(none.totalCount).toBe(0)
  })
})
