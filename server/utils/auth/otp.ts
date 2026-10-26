import { randomInt, timingSafeEqual } from 'crypto'

export const OTP_TTL = 600 // 10 minutes
export const VERIFIED_TTL = 300 // 5 minutes
export const MAX_ATTEMPTS = 5
export const RATE_LIMIT_WINDOW = 3600 // 1 hour
export const MAX_REQUESTS = 3

// Key generators
const getRateLimitKey = (email: string) => `otp:rate-limit:${email}`
const getOtpKey = (email: string) => `otp:${email}`
const getAttemptsKey = (email: string) => `otp:attempts:${email}`
const getVerifiedKey = (email: string) => `otp:verified:${email}`

export const generateOTP = () => {
  return randomInt(100000, 999999).toString()
}

export const safeCompare = (a: string, b: string) => {
  if (a.length !== b.length) {
    return false
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

// Storage Helpers
export const otpStorage = {
  async checkRateLimit(email: string) {
    const storage = useStorage('redis')
    const key = getRateLimitKey(email)
    const rateLimit = await storage.getItem<{ requests: number }>(key)
    
    if (rateLimit && rateLimit.requests >= MAX_REQUESTS) {
      return false
    }
    return true
  },

  async incrementRateLimit(email: string) {
    const storage = useStorage('redis')
    const key = getRateLimitKey(email)
    const rateLimit = await storage.getItem<{ requests: number }>(key)
    
    await storage.setItem(key, { 
      requests: (rateLimit?.requests || 0) + 1 
    }, { ttl: RATE_LIMIT_WINDOW })
  },

  async storeOtp(email: string, userId: string, otp: string) {
    const storage = useStorage('redis')
    // Store OTP
    await storage.setItem(getOtpKey(email), {
      userId,
      otp,
      createdAt: Date.now()
    }, { ttl: OTP_TTL })
    
    // Reset attempts
    await storage.removeItem(getAttemptsKey(email))
  },

  async getOtp(email: string) {
    const storage = useStorage('redis')
    return await storage.getItem<{ userId: string, otp: string, createdAt: number }>(getOtpKey(email))
  },

  async incrementAttempts(email: string) {
    const storage = useStorage('redis')
    const key = getAttemptsKey(email)
    const attempts = await storage.getItem<{ count: number }>(key)
    const newCount = (attempts?.count || 0) + 1
    
    await storage.setItem(key, { count: newCount }, { ttl: 600 }) // Keep attempts record for 10 mins
    
    return newCount
  },

  async deleteOtp(email: string) {
    const storage = useStorage('redis')
    await storage.removeItem(getOtpKey(email))
    await storage.removeItem(getAttemptsKey(email))
  },

  async markVerified(email: string, userId: string) {
    const storage = useStorage('redis')
    await storage.setItem(getVerifiedKey(email), {
      userId,
      verifiedAt: Date.now()
    }, { ttl: VERIFIED_TTL })
  },

  async getVerifiedToken(email: string) {
    const storage = useStorage('redis')
    return await storage.getItem<{ userId: string, verifiedAt: number }>(getVerifiedKey(email))
  },

  async clearVerifiedToken(email: string) {
    const storage = useStorage('redis')
    await storage.removeItem(getVerifiedKey(email))
    // Optional: Clean up rate limit on success so user can request again later if needed
    await storage.removeItem(getRateLimitKey(email)) 
  }
}