import { getUserById, updateUser } from '~~/server/db/queries/users'
import { getUserByEmail } from '~~/server/db/queries/auth'
import { updateProfileSchema } from '~~/shared/validator/user.schema'
import { hashPassword, verifyPasswordHash } from '~~/server/utils/auth/password'
import { accounts } from '~~/server/db/schemas'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  const body = await readValidatedBody(event, (body) => updateProfileSchema.parse(body))

  // Email uniqueness check before update
  if (body.email && body.email !== session.user.email) {
    const existingUser = await getUserByEmail(body.email)
    if (existingUser && existingUser.id !== session.user.id) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Email already in use'
      })
    }
  }

  // Fetch current user data
  const currentUser = await getUserById(session.user.id)

  if (!currentUser) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  const updateData: {
    username: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    updatedAt: Date;
  } = {
    username: body.username,
    email: body.email,
    firstName: body.first_name,
    lastName: body.last_name,
    updatedAt: new Date()
  }

  // Handle password update
  if (body.password_new && body.password_new.length > 0) {
    if (!body.password_current) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Current password is required to set a new password'
      })
    }

    // Query accounts table for hashedPassword (not on users table)
    const db = useDrizzle()
    const credentialsAccount = await db.query.accounts.findFirst({
      where: { AND: [{ userId: session.user.id }, { provider: 'credentials' }] }
    })

    if (!credentialsAccount?.hashedPassword) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No credentials account found'
      })
    }

    const isPasswordValid = await verifyPasswordHash(credentialsAccount.hashedPassword, body.password_current)
    if (!isPasswordValid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid current password'
      })
    }

    // Update password on accounts table
    const hashedNewPassword = await hashPassword(body.password_new)
    await db.update(accounts)
      .set({ hashedPassword: hashedNewPassword, updatedAt: new Date() })
      .where(and(eq(accounts.userId, session.user.id), eq(accounts.provider, 'credentials')))
  }

  const updatedUser = await updateUser(session.user.id, updateData)

  if (!updatedUser) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update user'
    })
  }

  // Update session — preserve all existing fields, only update changed ones
  await setUserSession(event, {
    user: {
      ...session.user,
      username: updatedUser.username,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      avatarUrl: updatedUser.avatarUrl ?? session.user.avatarUrl,
    },
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    expiresAt: session.expiresAt,
    loggedInAt: session.loggedInAt
  })

  return { success: true, user: updatedUser }
})
