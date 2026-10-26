import { validateVerificationToken } from '~~/server/utils/email/verification'
import { getUserByEmail, updateEmailVerified } from '~~/server/db/queries/auth'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const token = query.token as string

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Missing verification token' })
  }

  const email = await validateVerificationToken(token)
  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or expired verification token' })
  }

  const user = await getUserByEmail(email)
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  await updateEmailVerified(user.id, true)

  return sendRedirect(event, '/auth/login?verified=true')
})
