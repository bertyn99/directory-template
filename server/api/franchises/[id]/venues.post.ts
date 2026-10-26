import { z } from 'zod'
import { getFranchiseByIdAndOwnerId } from '~~/server/db/queries/franchises'
import { manageFranchiseVenues } from '~~/shared/utils/abilities'
import { venues, userVenues } from '~~/server/db/schemas'
import { eq, and } from 'drizzle-orm'
import { useDrizzle } from '#imports'

const bodySchema = z.object({
  venueId: z.number().int().positive(),
})

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

    const franchise = await getFranchiseByIdAndOwnerId(franchiseId, session.user.id)
    const isOwner = !!franchise

    if (!manageFranchiseVenues(session.user, isOwner)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied',
      })
    }

    const body = await readValidatedBody(event, (b) => bodySchema.parse(b))

    // Verify the user owns this venue
    const db = useDrizzle()
    const ownership = await db
      .select({ venueId: userVenues.venueId })
      .from(userVenues)
      .where(and(
        eq(userVenues.userId, session.user.id),
        eq(userVenues.venueId, body.venueId),
      ))
      .limit(1)

    if (ownership.length === 0) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not own this venue',
      })
    }

    // Check venue is not already in another franchise
    const [existingVenue] = await db
      .select({ franchiseId: venues.franchiseId })
      .from(venues)
      .where(eq(venues.id, body.venueId))
      .limit(1)

    if (existingVenue?.franchiseId) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Venue is already assigned to a franchise',
      })
    }

    // Assign venue to franchise
    await db
      .update(venues)
      .set({ franchiseId })
      .where(eq(venues.id, body.venueId))

    return { success: true }
  }
  catch (err: unknown) {
    const error = err as Error

    if (error.name === 'H3Error') {
      throw error
    }

    console.error('Error assigning venue to franchise:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to assign venue to franchise',
    })
  }
})
