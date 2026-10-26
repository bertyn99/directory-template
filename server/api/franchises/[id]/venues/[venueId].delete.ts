import { getFranchiseByIdAndOwnerId } from '~~/server/db/queries/franchises'
import { manageFranchiseVenues } from '~~/shared/utils/abilities'
import { venues } from '~~/server/db/schemas'
import { eq, and } from 'drizzle-orm'
import { useDrizzle } from '#imports'

export default defineEventHandler(async (event) => {
  try {
    const session = await requireUserSession(event)

    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'Missing franchise ID' })
    }

    const franchiseId = parseInt(id)
    if (isNaN(franchiseId)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid franchise ID' })
    }

    const venueIdParam = getRouterParam(event, 'venueId')
    if (!venueIdParam) {
      throw createError({ statusCode: 400, statusMessage: 'Missing venue ID' })
    }

    const venueId = parseInt(venueIdParam)
    if (isNaN(venueId)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid venue ID' })
    }

    const franchise = await getFranchiseByIdAndOwnerId(franchiseId, session.user.id)
    const isOwner = !!franchise

    if (!manageFranchiseVenues(session.user, isOwner)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied',
      })
    }

    // Verify the venue belongs to this franchise before removing
    const db = useDrizzle()
    const [venue] = await db
      .select({ franchiseId: venues.franchiseId })
      .from(venues)
      .where(and(
        eq(venues.id, venueId),
        eq(venues.franchiseId, franchiseId),
      ))
      .limit(1)

    if (!venue) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Venue not found in this franchise',
      })
    }

    // Unassign venue from franchise
    await db
      .update(venues)
      .set({ franchiseId: null })
      .where(eq(venues.id, venueId))

    return { success: true }
  }
  catch (err: unknown) {
    const error = err as Error

    if (error.name === 'H3Error') {
      throw error
    }

    console.error('Error removing venue from franchise:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to remove venue from franchise',
    })
  }
})
