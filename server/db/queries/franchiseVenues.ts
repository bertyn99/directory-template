import { eq, and } from 'drizzle-orm'
import { venues, franchises } from '../schemas'
import { useDrizzle } from '~~/server/utils/drizzle'

export async function getFranchiseVenues(franchiseId: number) {
  try {
    const db = useDrizzle()
    return await db.select().from(venues).where(eq(venues.franchiseId, franchiseId))
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch franchise venues' })
  }
}

/** Franchise venue list with dashboard columns only. */
export async function getFranchiseVenuesList(franchiseId: number) {
  return useDrizzle()
    .select({
      id: venues.id,
      name: venues.name,
      slug: venues.slug,
      statusCode: venues.statusCode,
      rating: venues.rating,
      website: venues.website,
      tel: venues.tel,
      createdAt: venues.createdAt,
    })
    .from(venues)
    .where(eq(venues.franchiseId, franchiseId))
    .orderBy(venues.name)
}

export async function assignVenueToFranchise(venueId: number, franchiseId: number) {
  try {
    const db = useDrizzle()
    const [updated] = await db.update(venues)
      .set({ franchiseId })
      .where(eq(venues.id, venueId))
      .returning()
    return updated
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Failed to assign venue to franchise' })
  }
}

export async function unassignVenueFromFranchise(venueId: number) {
  try {
    const db = useDrizzle()
    const [updated] = await db.update(venues)
      .set({ franchiseId: null })
      .where(eq(venues.id, venueId))
      .returning()
    return updated
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Failed to unassign venue from franchise' })
  }
}

export async function isFranchiseOwner(franchiseId: number, userId: string) {
  try {
    const db = useDrizzle()
    const [franchise] = await db.select({ id: franchises.id })
      .from(franchises)
      .where(and(
        eq(franchises.id, franchiseId),
        eq(franchises.ownerId, userId),
      ))
    return !!franchise
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Failed to check franchise ownership' })
  }
}
