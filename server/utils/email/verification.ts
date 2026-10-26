const VERIFICATION_TOKEN_TTL = 60 * 60
const TOKEN_LENGTH = 32

const getVerificationTokenKey = (token: string) => `verification:token:${token}`
const getVerificationEmailKey = (email: string) => `verification:email:${email}`

const bytesToHex = (bytes: Uint8Array) => {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function generateVerificationToken(email: string): Promise<string> {
  const storage = useStorage('redis')

  const existingToken = await storage.getItem<string>(getVerificationEmailKey(email))
  if (existingToken) {
    await storage.removeItem(getVerificationTokenKey(existingToken))
  }

  const tokenBytes = crypto.getRandomValues(new Uint8Array(TOKEN_LENGTH))
  const token = bytesToHex(tokenBytes)

  await storage.setItem(getVerificationTokenKey(token), email, { ttl: VERIFICATION_TOKEN_TTL })
  await storage.setItem(getVerificationEmailKey(email), token, { ttl: VERIFICATION_TOKEN_TTL })

  return token
}

export async function validateVerificationToken(token: string): Promise<string | null> {
  const storage = useStorage('redis')
  const email = await storage.getItem<string>(getVerificationTokenKey(token))

  if (!email) {
    return null
  }

  const existingToken = await storage.getItem<string>(getVerificationEmailKey(email))
  if (existingToken === token) {
    await storage.removeItem(getVerificationTokenKey(token))
    await storage.removeItem(getVerificationEmailKey(email))
  }

  return email
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const appUrl = process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'

  console.log(`[STUB] Verification email for ${email}. Token: ${token}`)
  console.log(`[STUB] Verification URL: ${appUrl}/api/auth/verify-email?token=${token}`)
}
