/**
 * Test User Helper Utilities
 * 
 * Provides functions to create, delete, and manage test users
 * for E2E testing via API calls.
 */

export interface TestUser {
  email: string
  password: string
  username: string
}

/**
 * Create a test user via API
 * 
 * @param baseURL - Base URL of the application (e.g., http://localhost:3000)
 * @param user - Test user data
 * @returns Created user data with ID
 */
export async function createTestUser(
  baseURL: string,
  user: TestUser
): Promise<{ id: string; email: string; username: string }> {
  const response = await fetch(`${baseURL}/api/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(user),
  })

  if (!response.ok) {
    throw new Error(`Failed to create test user: ${response.statusText}`)
  }

  const data = await response.json()
  return data.user
}

/**
 * Delete a test user via API
 * 
 * @param baseURL - Base URL of the application
 * @param userId - User ID to delete
 * @param authToken - Authentication token (if required)
 */
export async function deleteTestUser(
  baseURL: string,
  userId: string,
  authToken?: string
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const response = await fetch(`${baseURL}/api/users/${userId}`, {
    method: 'DELETE',
    headers,
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete test user: ${response.statusText}`)
  }
}

/**
 * Get test user by email via API
 * 
 * @param baseURL - Base URL of the application
 * @param email - User email
 * @param authToken - Authentication token (if required)
 */
export async function getTestUser(
  baseURL: string,
  email: string,
  authToken?: string
): Promise<{ id: string; email: string; username: string } | null> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const response = await fetch(`${baseURL}/api/users?email=${encodeURIComponent(email)}`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    throw new Error(`Failed to get test user: ${response.statusText}`)
  }

  const data = await response.json()
  return data.user || null
}

/**
 * Login test user and get session cookie
 * 
 * @param baseURL - Base URL of the application
 * @param email - User email
 * @param password - User password
 * @returns Session cookie value
 */
export async function loginTestUser(
  baseURL: string,
  email: string,
  password: string
): Promise<string> {
  const response = await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error(`Failed to login test user: ${response.statusText}`)
  }

  // Extract session cookie from Set-Cookie header
  const setCookieHeader = response.headers.get('set-cookie')
  if (!setCookieHeader) {
    throw new Error('No session cookie returned from login')
  }

  // Parse cookie (format: "name=value; Path=/; HttpOnly; Secure; SameSite=Strict")
  const cookieMatch = setCookieHeader.match(/^([^=]+)=([^;]+)/)
  if (!cookieMatch) {
    throw new Error('Failed to parse session cookie')
  }

  return setCookieHeader
}

/**
 * Logout test user
 * 
 * @param baseURL - Base URL of the application
 * @param sessionCookie - Session cookie from login
 */
export async function logoutTestUser(
  baseURL: string,
  sessionCookie: string
): Promise<void> {
  const response = await fetch(`${baseURL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to logout test user: ${response.statusText}`)
  }
}
