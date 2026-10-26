import { eq } from 'drizzle-orm'
import { users } from '~~/server/db/schemas'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  const db = useDrizzle()

  // Delete the user — cascades will handle accounts, sessions, etc.
  await db.delete(users).where(eq(users.id, session.user.id))

  // Clear the session
  await clearUserSession(event)

  return { success: true }
})
