const MAX_ATTEMPTS = 5
const BASE_LOCKOUT_MS = 60_000 // 1 minute
const LOCKOUT_TTL_MS = 30 * 60_000 // 30 minutes max lockout

// Redis key patterns
const getAttemptsKey = (email: string) => `lockout:attempts:${email}`
const getLockedKey = (email: string) => `lockout:locked:${email}`

const normalizeEmail = (email: string) => email.toLowerCase().trim()

export const lockoutStorage = {
  async checkAccountLockout(email: string): Promise<{ locked: boolean; remainingMs?: number }> {
    const storage = useStorage('redis')
    const key = getLockedKey(normalizeEmail(email))
    const lockData = await storage.getItem<{ lockedAt: number; ttl: number }>(key)

    if (!lockData) {
      return { locked: false }
    }

    const elapsed = Date.now() - lockData.lockedAt
    const remainingMs = lockData.ttl - elapsed

    if (remainingMs <= 0) {
      return { locked: false }
    }

    return { locked: true, remainingMs }
  },

  async recordFailedAttempt(email: string): Promise<number> {
    const storage = useStorage('redis')
    const normalized = normalizeEmail(email)
    const key = getAttemptsKey(normalized)

    const attempts = await storage.getItem<{ count: number }>(key)
    const newCount = (attempts?.count || 0) + 1

    await storage.setItem(key, { count: newCount }, { ttl: LOCKOUT_TTL_MS / 1000 })

    if (newCount >= MAX_ATTEMPTS) {
      const exponent = newCount - MAX_ATTEMPTS
      const ttlMs = Math.min(BASE_LOCKOUT_MS * Math.pow(2, exponent), LOCKOUT_TTL_MS)
      const lockedKey = getLockedKey(normalized)

      await storage.setItem(lockedKey, {
        lockedAt: Date.now(),
        ttl: ttlMs,
      }, { ttl: ttlMs / 1000 })
    }

    return newCount
  },

  async clearFailedAttempts(email: string): Promise<void> {
    const storage = useStorage('redis')
    const normalized = normalizeEmail(email)

    await storage.removeItem(getAttemptsKey(normalized))
    await storage.removeItem(getLockedKey(normalized))
  },
}
