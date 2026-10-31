import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import {
  getPublicFranchiseBySlug,
  getPublicFranchiseSlugs,
} from '../../../server/db/queries/franchises'
import {
  closePgliteTestDb,
  createPgliteTestDb,
  truncateAll,
} from '../../setup/pglite-db'
import { seedAddress, seedCity, seedFranchise, seedVenue } from '../db/factories'

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

describe('getPublicFranchiseBySlug', () => {
  it('returns the franchise with only its active venues, 404s (null) otherwise', async () => {
    const live = await seedFranchise(db, {
      name: 'Pista Group Live',
      ownerId: null,
    })
    await seedVenue(db, { name: 'Club A', franchiseId: live.id, statusCode: 'active' })
    await seedVenue(db, { name: 'Club Closed', franchiseId: live.id, statusCode: 'closed' })

    const ghost = await seedFranchise(db, { name: 'Ghost Group' })
    await seedVenue(db, { name: 'Gone Club', franchiseId: ghost.id, statusCode: 'closed' })
    // Franchise with NO venues at all is equally unlisted.
    const empty = await seedFranchise(db, { name: 'Empty Group' })

    const found = await getPublicFranchiseBySlug(live.slug!)
    expect(found?.name).toBe('Pista Group Live')
    expect(found?.venues.map(v => v.name)).toEqual(['Club A'])

    expect(await getPublicFranchiseBySlug(ghost.slug!)).toBeNull()
    expect(await getPublicFranchiseBySlug(empty.slug!)).toBeNull()
    expect(await getPublicFranchiseBySlug('does-not-exist')).toBeNull()
  })

  it('never leaks owner-only columns (ownerId, isHome, statusCode)', async () => {
    const franchise = await seedFranchise(db, {
      name: 'Leaky Group',
      description: { fr: { intro: 'Bonjour', text: 'Corps' } },
      socialMedia: { instagram: 'https://instagram.com/leaky' },
    })
    await seedVenue(db, { name: 'Public Club', franchiseId: franchise.id, statusCode: 'active' })

    const found = await getPublicFranchiseBySlug(franchise.slug!)
    expect(found).not.toBeNull()
    expect(found!).not.toHaveProperty('ownerId')
    expect(found!).not.toHaveProperty('isHome')
    const [venue] = found!.venues
    expect(venue).not.toHaveProperty('statusCode')
    expect(venue).not.toHaveProperty('website')
    expect(venue).not.toHaveProperty('tel')
  })

  it('orders venues by city name then venue name', async () => {
    const franchise = await seedFranchise(db, { name: 'Ordered Group' })
    // Insert in scrambled order; alphabetical city (Berlin < Paris) and
    // name (Alpha < Beta) ordering must win.
    const paris = await seedCity(db, { name: 'Paris' })
    const berlin = await seedCity(db, { name: 'Berlin', countryCode: 'DE' })
    const parisAddr = await seedAddress(db, { cityId: paris.id })
    const berlinAddr = await seedAddress(db, { cityId: berlin.id })
    await seedVenue(db, { name: 'Zeta Paris', franchiseId: franchise.id, addressId: parisAddr.id })
    await seedVenue(db, { name: 'Beta Berlin', franchiseId: franchise.id, addressId: berlinAddr.id })
    await seedVenue(db, { name: 'Alpha Berlin', franchiseId: franchise.id, addressId: berlinAddr.id })

    const found = await getPublicFranchiseBySlug(franchise.slug!)
    expect(found?.venues.map(v => v.name)).toEqual([
      'Alpha Berlin',
      'Beta Berlin',
      'Zeta Paris',
    ])
  })
})

describe('getPublicFranchiseSlugs', () => {
  it('emits only franchises with at least one active venue, deduped', async () => {
    const live = await seedFranchise(db, { name: 'Listed Group' })
    await seedVenue(db, { name: 'Open Club', franchiseId: live.id, statusCode: 'active' })
    await seedVenue(db, { name: 'Open Club Two', franchiseId: live.id, statusCode: 'active' })
    const hidden = await seedFranchise(db, { name: 'Unlisted Group' })
    await seedVenue(db, { name: 'Shut Club', franchiseId: hidden.id, statusCode: 'removed_by_owner' })

    const slugs = (await getPublicFranchiseSlugs()).map(row => row.slug)
    expect(slugs).toContain(live.slug)
    expect(slugs).not.toContain(hidden.slug)
    // groupBy(slug) must collapse the multi-venue franchise into ONE row.
    expect(slugs.filter(slug => slug === live.slug)).toHaveLength(1)
  })
})
