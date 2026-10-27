import type { directoryConfig } from '~~/directory.config'

declare module '#auth-utils' {
  interface User {
    id: string
    username: string | null
    email: string
    role: 'admin' | 'user'
    firstName?: string | null
    lastName?: string | null
    avatarUrl?: string | null
    emailVerified?: boolean
    hasPaidSubscription?: boolean
    onboardingStep: number

    // SaaS feature limits
    subscription?: {
      // Derived from directory.config.ts `billing` — the single source for
      // plan ids (create Stripe products with exactly those ids).
      plan: 'free' | (typeof directoryConfig.billing.plans)[number]['id']
      status: 'active' | 'canceled' | 'past_due' | 'unpaid'
      currentPeriodEnd?: Date
    }
  }

  interface UserSession {
    userAgent?: string
    ipAddress?: string
    expiresAt?: Date
  }

  interface SecureSessionData {
    stripeCustomerId?: string
  }
}

export { }
