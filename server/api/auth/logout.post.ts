/**
 * POST /api/auth/logout
 *
 * Destroys the server-side session (invalidates the httpOnly session cookie)
 * and returns success. The client then clears its local session state and
 * navigates home.
 */
export default defineEventHandler(async (event) => {
  await clearUserSession(event)
  return { success: true }
})
