import { createUserWithCredentials } from '~~/server/db/queries/auth'
/* import { sendEmail } from '~~/server/utils/email' */
import { sendVerificationEmail, generateVerificationToken } from '~~/server/utils/email/verification'
import { extractSessionDataInRequest } from '~~/server/utils/session'
import { registerUserSchema } from '~~/shared/validator/user.schema'
import { hashPassword } from '~~/server/utils/auth/password'

export default defineEventHandler(async (event) => {
  try {
    const body = await readValidatedBody(event, registerUserSchema.parse)
    if (!body) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid input' })
    }

    const { email, username, password } = body
    const hashedPassword = await hashPassword(password)

    let user: Awaited<ReturnType<typeof createUserWithCredentials>>
    try {
      const db = useDrizzle()
      user = await db.transaction(async (tx) => {
        return await createUserWithCredentials({ email, username }, hashedPassword, tx)
      })
    }
    catch (error: unknown) {
      // Catch PostgreSQL unique_violation (23505) - email or username already taken
      // Drizzle wraps pg errors - check both the error and its cause chain
      const getErrorCode = (err: unknown): string | undefined => {
        if (err && typeof err === 'object') {
          const e = err as { code?: string, cause?: unknown }
          return e.code || getErrorCode(e.cause)
        }
        return undefined
      }
      if (getErrorCode(error) === '23505') {
        throw createError({ statusCode: 409, statusMessage: 'Email or username already exists' })
      }
      throw error
    }

    const userData = {
      username: user.username,
      id: user.id,
      email: user.email as string,
      role: user.role as 'admin' | 'user',
      hasPaidSubscription: false,
      onboardingStep: user.onboardingStep,
      emailVerified: false,
    }

    const { userAgent, ipAddress, expiresAt } = extractSessionDataInRequest(event)
    await setUserSession(event, {
      user: userData,
      userAgent,
      ipAddress,
      expiresAt,
      loggedInAt: new Date(),
    })

    event.waitUntil(async () => {
      try {
        const config = useRuntimeConfig()
        const _appBaseUrl = config.public.appBaseUrl || 'https://example-directory.com'

        // Send welcome email to newly registered user
        /*  await sendEmail(event, {
           templateName: 'Signup',
           subject: '🎉 Welcome to Kosmo Notes!',
           to: user.email,
           props: {
             userName: user.username,
             confirmationUrl: `${_appBaseUrl}/onboarding`,
           },
           eventName: 'user.signup_welcome',
         }) */
      }
      catch (emailError) {
        console.error('Failed to send welcome email:', emailError)
      }
    })

    event.waitUntil(async () => {
      try {
        const token = await generateVerificationToken(user.email)
        await sendVerificationEmail(user.email, token)
      }
      catch (emailError) {
        console.error('Failed to send verification email:', emailError)
      }
    })
    return { success: true, user }
  }
  catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    console.error('Error handling signup request:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to process request',
    })
  }
})
