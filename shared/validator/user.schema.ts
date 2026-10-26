// shared/validator/user.schema.ts
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import { users } from '~~/server/db/schemas'

// Define the pattern for your user ID
// const userIdPattern = new RegExp(`^usr_${uuidPattern.source}$`)

export const userSchema = createInsertSchema(users, {
    email: z.email('Please enter a valid email address'),
    username: z.string().min(3),
}).pick({
    email: true,
    username: true,
})

export const userSelectSchema = createSelectSchema(users, {
    email: z.email('Please enter a valid email address'),
    username: z.string().min(3),
})

export const loginUserSchema = userSchema.extend({
    password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
}).pick({
    email: true,
    password: true,
})

export const registerUserSchema = userSchema.extend({
    password: z.string()
        .min(8, { message: 'Password must be at least 8 characters long' })
        .max(100, { message: 'Password cannot exceed 100 characters' })
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
            message: 'Password must include uppercase, lowercase, number, and special character',
        }),
})

export const updateProfileSchema = z.object({
    username: z.string().min(3),
    email: z.string().email(),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    password_current: z.string().optional().or(z.literal('')),
    password_new: z.string()
      .min(8, { message: 'Password must be at least 8 characters long' })
      .max(100, { message: 'Password cannot exceed 100 characters' })
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
        message: 'Password must include uppercase, lowercase, number, and special character',
      })
      .optional()
      .or(z.literal(''))
})
