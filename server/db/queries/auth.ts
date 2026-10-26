import { eq } from 'drizzle-orm'
import { useDrizzle } from '~~/server/utils/drizzle'
import { accounts, users } from '../schemas'


export const getUserByEmail = async (email: string) => {
    try {
        const db = useDrizzle()
        return await db.query.users.findFirst({
            where: { email },
        })
    } catch {
        throw createError({ statusCode: 500, statusMessage: 'Failed to fetch user by email' })
    }
}

export const getUserByEmailOrUsername = async (email: string, username: string) => {
    try {
        const db = useDrizzle()
        return await db.query.users.findFirst({
            where: { OR: [{ email }, { username }] },
        })
    } catch {
        throw createError({ statusCode: 500, statusMessage: 'Failed to fetch user by email or username' })
    }
}

export const findAccountCredentials = async (userId: string) => {
    try {
        const db = useDrizzle()
        return await db.query.accounts.findFirst({
            where: { AND: [{ userId }, { provider: 'credentials' }] },
        })
    } catch {
        throw createError({ statusCode: 500, statusMessage: 'Failed to fetch account credentials' })
    }
}

export const createAccountCredentials = async (userId: string, hashedPassword: string, tx?: Parameters<Parameters<ReturnType<typeof useDrizzle>['transaction']>[0]>[0]) => {
    try {
        const db = tx || useDrizzle()
        return await db.insert(accounts).values({
            userId,
            provider: 'credentials',
            providerAccountId: userId,
            hashedPassword,
        })
    } catch {
        throw createError({ statusCode: 500, statusMessage: 'Failed to create account credentials' })
    }
}

export const createUser = async (user: { email: string, username: string }, tx?: Parameters<Parameters<ReturnType<typeof useDrizzle>['transaction']>[0]>[0]) => {
    try {
        const db = tx || useDrizzle()
        const [newUser] = await db.insert(users).values(user).returning()
        return newUser
    } catch {
        throw createError({ statusCode: 500, statusMessage: 'Failed to create user' })
    }
}

export const deleteUser = async (userId: string) => {
    try {
        const db = useDrizzle()
        await db.delete(users).where(eq(users.id, userId))
    } catch {
        throw createError({ statusCode: 500, statusMessage: 'Failed to delete user' })
    }
}

export const createUserWithCredentials = async (
    userData: { email: string, username: string },
    hashedPassword: string,
    tx?: Parameters<Parameters<ReturnType<typeof useDrizzle>['transaction']>[0]>[0]
) => {
    try {
        const db = tx || useDrizzle()

        // Create user + credentials in one operation
        const [newUser] = await db.insert(users).values(userData).returning()
        if (!newUser) {
            throw new Error('User creation failed')
        }

        await db.insert(accounts).values({
            userId: newUser.id,
            provider: 'credentials',
            providerAccountId: newUser.id,
            hashedPassword,
        })

        return newUser
    } catch {
        throw createError({ statusCode: 500, statusMessage: 'Failed to create user with credentials' })
    }
}

export async function updateEmailVerified(userId: string, verified: boolean) {
    try {
        const db = useDrizzle()
        await db
            .update(users)
            .set({ emailVerified: verified, updatedAt: new Date() })
            .where(eq(users.id, userId))
    } catch {
        throw createError({ statusCode: 500, statusMessage: 'Failed to update email verification status' })
    }
}
