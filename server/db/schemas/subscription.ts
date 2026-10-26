import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { users } from "./auth"

export const subscriptions = pgTable('subscriptions', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .unique()
        .references(() => users.id),
    plan: text('tier').notNull().default('free'),
    billingInterval: text('billing_interval', {
        enum: ['weekly', 'monthly', 'annual'],
    }).default('monthly'),
    stripeSubscriptionId: text('stripe_subscription_id').unique(),
    statusCode: text('status', {
        enum: ['active', 'canceled', 'past_due', 'unpaid'],
    }).notNull().default('active'),
    currentPeriodStart: timestamp('current_period_start'),
    currentPeriodEnd: timestamp('current_period_end'),
    createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .$defaultFn(() => new Date()),

    updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .$defaultFn(() => new Date()),
})
