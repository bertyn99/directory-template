import { eq } from 'drizzle-orm'
import { useDrizzle } from '~~/server/utils/drizzle'
import { subscriptions } from '../schemas'

/**
 * Get active subscription for a user
 * @param userId - The user ID to get subscription for
 * @returns Active or unpaid subscription or null
 */
export async function getActiveSubscription(userId: string) {
    const db = useDrizzle()
    return await db.query.subscriptions.findFirst({
        where: {
            userId,
            statusCode: { in: ['active', 'unpaid'] },
        },
    })
}

/**
 * Get subscription by Stripe subscription ID
 * @param stripeSubscriptionId - The Stripe subscription ID
 * @returns Subscription with user relation or null
 */
export async function getSubscriptionByStripeId(stripeSubscriptionId: string) {
    const db = useDrizzle()
    return await db.query.subscriptions.findFirst({
        where: { stripeSubscriptionId },
        with: {
            user: true,
        },
    })
}

/**
 * Get user by Stripe customer ID
 * @param stripeCustomerId - The Stripe customer ID
 * @returns User or null
 */
export async function getUserByStripeCustomerId(stripeCustomerId: string) {
    const db = useDrizzle()
    return await db.query.users.findFirst({
        where: { stripeCustomerId },
    })
}

/**
 * Create or update subscription
 * @param userId - The user ID
 * @param data - Subscription data
 * @returns Created or updated subscription
 */
export async function upsertSubscription(
    userId: string,
    data: {
        stripeSubscriptionId: string
        plan: string
        statusCode: 'active' | 'canceled' | 'past_due' | 'unpaid'
        currentPeriodEnd: Date
    },
) {
    const db = useDrizzle()
    const [result] = await db
        .insert(subscriptions)
        .values({
            userId,
            stripeSubscriptionId: data.stripeSubscriptionId,
            plan: data.plan,
            statusCode: data.status,
            currentPeriodEnd: data.currentPeriodEnd,
        })
        .onConflictDoUpdate({
            target: subscriptions.userId,
            set: {
                stripeSubscriptionId: data.stripeSubscriptionId,
                plan: data.plan,
                statusCode: data.status,
                currentPeriodEnd: data.currentPeriodEnd,
            },
        })
        .returning()

    return result
}

/**
 * Update subscription status
 * @param stripeSubscriptionId - The Stripe subscription ID
 * @param status - New status
 * @returns Updated subscription or null
 */
export async function updateSubscriptionStatus(
    stripeSubscriptionId: string,
    statusCode: 'active' | 'canceled' | 'past_due' | 'unpaid',
) {
    const db = useDrizzle()
    const [result] = await db
        .update(subscriptions)
        .set({ statusCode })
        .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
        .returning()

    return result || null
}

/**
 * Update subscription period end date
 * @param stripeSubscriptionId - The Stripe subscription ID
 * @param currentPeriodEnd - New period end date
 * @returns Updated subscription or null
 */
export async function updateSubscriptionPeriodEnd(
    stripeSubscriptionId: string,
    currentPeriodEnd: Date,
) {
    const db = useDrizzle()
    const [result] = await db
        .update(subscriptions)
        .set({ currentPeriodEnd })
        .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
        .returning()

    return result || null
}

/**
 * Update subscription plan
 * @param stripeSubscriptionId - The Stripe subscription ID
 * @param plan - New plan name
 * @returns Updated subscription or null
 */
export async function updateSubscriptionPlan(
    stripeSubscriptionId: string,
    plan: string,
) {
    const db = useDrizzle()
    const [result] = await db
        .update(subscriptions)
        .set({ plan })
        .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
        .returning()

    return result || null
}

