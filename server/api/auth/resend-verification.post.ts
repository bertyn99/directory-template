import { generateVerificationToken, sendVerificationEmail } from '~~/server/utils/email/verification'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  if (user.emailVerified) {
    throw createError({ statusCode: 400, statusMessage: 'Email already verified' })
  }

  const token = await generateVerificationToken(user.email)
  await sendVerificationEmail(user.email, token)

  return { success: true, message: 'Verification email sent' }
})
