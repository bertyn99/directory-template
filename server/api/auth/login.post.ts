import { findAccountCredentials, getUserByEmail } from "~~/server/db/queries/auth";
import { verifyPasswordHash } from "~~/server/utils/auth/password";
import { loginUserSchema } from "~~/shared/validator/user.schema";
import { lockoutStorage } from "~~/server/utils/auth/lockout";
import { customerSubscription } from "~~/server/utils/stripe";
import { extractSessionDataInRequest } from "~~/server/utils/session";
import { setUserSession } from "#imports";

export default defineEventHandler(async (event) => {
  try {
    const body = await readValidatedBody(event, loginUserSchema.parse)

    const { email, password } = body

    // Check account lockout before any user lookup
    const lockout = await lockoutStorage.checkAccountLockout(email)
    if (lockout.locked) {
      throw createError({
        statusCode: 429,
        statusMessage: `Account locked. Try again in ${Math.ceil(lockout.remainingMs! / 60000)} minutes.`,
      })
    }
    // Find user by email
    const userDb = await getUserByEmail(email)

    if (!userDb) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid email or password',
      })
    }

    // Find the 'credentials' account for this user
    const account = await findAccountCredentials(userDb.id)


    if (!account || !account.hashedPassword) {
      throw createError({
        statusCode: 401,
        message: 'Invalid credentials'
      })
    }

    const isPasswordValid = await verifyPasswordHash(account.hashedPassword, password)
    if (!isPasswordValid) {
      // Record failed attempt before throwing
      await lockoutStorage.recordFailedAttempt(email)
      throw createError({
        statusCode: 401,
        message: 'Invalid credentials'
      })
    }


    // check if user is subscribed
    const subscription = await customerSubscription(userDb)

    const userData = {
      username: userDb.username,
      id: userDb.id,
      email: userDb.email,
      role: userDb.role,
      hasPaidSubscription: !!subscription,
      onboardingStep: userDb.onboardingStep,
    }

    const { userAgent, ipAddress, expiresAt } = extractSessionDataInRequest(event)
    await setUserSession(event, {
      user: userData,
      secure: {
        stripeCustomerId: userDb.stripeCustomerId,
      },
      userAgent,
      ipAddress,
      expiresAt,
      loggedInAt: new Date(),
    })

    // Clear failed attempts on successful login
    await lockoutStorage.clearFailedAttempts(email)


    return { success: true, user: userData }
  }
  catch (error: unknown) {
    // Re-throw H3Errors (auth errors, etc.) — don't double-wrap
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    console.error('Error handling login request:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })
  }
});
