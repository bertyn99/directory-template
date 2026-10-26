import { eq } from 'drizzle-orm'
import { users } from '../schemas'
import { useDrizzle } from '~~/server/utils/drizzle'
import type { InsertUser } from '~~/server/types'

export async function getUserById(userId: string) {
  try {
    const db = useDrizzle()
    return await db.query.users.findFirst({
      where: { id: userId },
    })
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch user by ID' })
  }
}

export async function updateUser(userId: string, data: Partial<InsertUser>) {
  try {
    const db = useDrizzle()
    const [updatedUser] = await db.update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning()
    return updatedUser
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Failed to update user' })
  }
}
