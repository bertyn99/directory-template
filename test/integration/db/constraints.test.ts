import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import type { PGlite } from '@electric-sql/pglite'
import {
  accounts,
  venueCategories as typesTable,
  users,
} from '../../../server/db/schemas'
import {
  closePgliteTestDb,
  createPgliteTestDb,
  truncateAll,
} from '../../setup/pglite-db'
import { seedAccount, seedVenue, seedType, seedUser } from '../db/factories'

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

describe('schema integrity constraints', () => {
  it('cascades account deletion with its user (ON DELETE CASCADE)', async () => {
    const user = await seedUser(db)
    await seedAccount(db, user.id, 'provider-account-x')

    await db.delete(users).where(eq(users.id, user.id))

    const remaining = await db.select().from(accounts)
    expect(remaining).toHaveLength(0)
  })

  it('cascades venue deletion with its type (venues.categoryId ON DELETE CASCADE)', async () => {
    const type = await seedType(db)
    const venue = await seedVenue(db, { name: 'Cascade Venue', categoryId: type.id })

    await db.delete(typesTable).where(eq(typesTable.id, type.id))

    const survivors = await pglite.query<{ id: number }>(
      `SELECT id FROM venues WHERE id = ${venue.id}`,
    )
    expect(survivors.rows).toHaveLength(0)
  })
})
