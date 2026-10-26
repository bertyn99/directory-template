import { hash, verify } from '@node-rs/argon2'
import { z } from 'zod'

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const hashPassword = async (password: string) => {
  return await hash(password)
}

export const verifyPasswordHash = async (hash: string, password: string) => {
  return await verify(hash, password)
}
