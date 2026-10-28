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
import { seedFranchise, seedVenue } from '../db/factories'

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
  it('returns the franchise and its active venues, 404s when none are public', async () => {
    const live = await seedFranchise(db, { name: 'Pista Group Live' })
    await seedVenue(db, { name: 'Club A', franchiseId: live.id, statusCode: 'active' })
    await seedVenue(db, { name: 'Club Closed', franchiseId: live.id, statusCode: 'closed' })

    const ghost = await seedFranchise(db, { name: 'Ghost Group' })
    await seedVenue(db, { name: 'Gone Club', franchiseId: ghost.id, statusCode: 'closed' })

    const found = await getPublicFranchiseBySlug(live.slug!)
    expect(found?.name).toBe('Pista Group Live')
    expect(found?.venues.map(v => v.name)).toEqual(['Club A'])

    expect(await getPublicFranchiseBySlug(ghost.slug!)).toBeNull()
    expect(await getPublicFranchiseBySlug('does-not-exist')).toBeNull()
  })
})

describe('getPublicFranchiseSlugs', () => {
  it('emits only franchises with at least one active venue', async () => {
    const live = await seedFranchise(db, { name: 'Listed Group' })
    await seedVenue(db, { name: 'Open Club', franchiseId: live.id, statusCode: 'active' })
    const hidden = await seedFranchise(db, { name: 'Unlisted Group' })
    await seedVenue(db, { name: 'Shut Club', franchiseId: hidden.id, statusCode: 'removed_by_owner' })

    const slugs = (await getPublicFranchiseSlugs()).map(row => row.slug)
    expect(slugs).toContain(live.slug)
    expect(slugs).not.toContain(hidden.slug)
  })
})
