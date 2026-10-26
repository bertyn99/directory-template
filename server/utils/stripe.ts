import type { H3Event, EventHandlerRequest } from 'h3'
import { eq } from 'drizzle-orm'
import { useServerStripe } from '#stripe/server'
import { users } from '~~/server/db/schemas'

type User = typeof users.$inferSelect

export async function getOrCreateCustomerId(user: User, event: H3Event<EventHandlerRequest>) {
    // Check if user already has a Stripe Customer ID
    if (user.stripeCustomerId) {
        return user.stripeCustomerId
    }

    const stripe = await useServerStripe(event)

    // Create a new Stripe Customer
    const customer = await stripe.customers.create({
        email: user.email,
        name: user.username,
    })

    // Save the Stripe Customer ID to the user's record in the database
    await useDrizzle().update(users)
        .set({ stripeCustomerId: customer.id })
        .where(eq(users.id, user.id))

    return customer.id
}

export async function customerSubscription(user: User) {
    return await useDrizzle().query.subscriptions.findFirst({
        where: {
            userId: user.id,
            statusCode: { in: ['active', 'unpaid'] },
        },
    })
}
