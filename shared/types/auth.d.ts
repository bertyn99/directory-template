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
      // ⚠️ Must match the Stripe product names created per instantiation — update here AND in the Stripe dashboard.
      plan: 'free' | 'premium' | 'premium_pro'
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
