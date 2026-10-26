// shared/validator/subscription.schema.ts
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import { subscriptions } from '~~/server/db/schemas'

export const subscriptionSchema = createInsertSchema(subscriptions, {
    plan: z.string().default('free'),
    billingInterval: z.enum(['weekly', 'monthly', 'annual']).default('monthly'),
    status: z.enum(['active', 'canceled', 'past_due', 'unpaid']).default('active'),
    stripeSubscriptionId: z.string().optional(),
    currentPeriodStart: z.date().optional(),
    currentPeriodEnd: z.date().optional(),
})

export const subscriptionSelectSchema = createSelectSchema(subscriptions, {
    plan: z.string(),
    billingInterval: z.enum(['weekly', 'monthly', 'annual']),
    status: z.enum(['active', 'canceled', 'past_due', 'unpaid']),
})

// Schema for creating a subscription
export const createSubscriptionSchema = subscriptionSchema.pick({
    userId: true,
    plan: true,
    billingInterval: true,
    stripeSubscriptionId: true,
    status: true,
    currentPeriodStart: true,
    currentPeriodEnd: true,
})

// Schema for updating a subscription
export const updateSubscriptionSchema = subscriptionSchema.partial().pick({
    plan: true,
    billingInterval: true,
    status: true,
    currentPeriodStart: true,
    currentPeriodEnd: true,
    stripeSubscriptionId: true,
})

// Type exports
export type Subscription = z.infer<typeof subscriptionSelectSchema>
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>

