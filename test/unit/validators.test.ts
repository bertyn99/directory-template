// test/unit/validators.test.ts
import { describe, expect, it } from 'vitest'
import {
  loginUserSchema,
  registerUserSchema,
  updateProfileSchema,
  userSchema,
} from '~~/shared/validator/user.schema'

// ─── userSchema ──────────────────────────────────────────────
describe('userSchema', () => {
  it('accepts valid email and username', () => {
    const result = userSchema.safeParse({ email: 'test@example.com', username: 'john' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = userSchema.safeParse({ email: 'not-an-email', username: 'john' })
    expect(result.success).toBe(false)
  })

  it('rejects username shorter than 3 characters', () => {
    const result = userSchema.safeParse({ email: 'test@example.com', username: 'ab' })
    expect(result.success).toBe(false)
  })

  it('rejects missing email', () => {
    const result = userSchema.safeParse({ username: 'john' })
    expect(result.success).toBe(false)
  })

  it('rejects missing username', () => {
    const result = userSchema.safeParse({ email: 'test@example.com' })
    expect(result.success).toBe(false)
  })
})

// ─── loginUserSchema ─────────────────────────────────────────
describe('loginUserSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginUserSchema.safeParse({ email: 'test@example.com', password: 'password123' })
    expect(result.success).toBe(true)
  })

  it('rejects password shorter than 8 characters', () => {
    const result = loginUserSchema.safeParse({ email: 'test@example.com', password: 'short' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = loginUserSchema.safeParse({ email: 'bad', password: 'password123' })
    expect(result.success).toBe(false)
  })

  it('reports password min-length error message', () => {
    const result = loginUserSchema.safeParse({ email: 'test@example.com', password: 'short' })
    expect(result.success).toBe(false)
    const messages = result.error?.issues.map((i: { message: string }) => i.message) ?? []
    expect(messages).toContain('Password must be at least 8 characters long')
  })
})

// ─── registerUserSchema ──────────────────────────────────────
describe('registerUserSchema', () => {
  it('accepts valid registration data', () => {
    const result = registerUserSchema.safeParse({
      email: 'test@example.com',
      username: 'john',
      password: 'Password1!',
    })
    expect(result.success).toBe(true)
  })

  it('rejects password without special character', () => {
    const result = registerUserSchema.safeParse({
      email: 'test@example.com',
      username: 'john',
      password: 'Password1',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password without number', () => {
    const result = registerUserSchema.safeParse({
      email: 'test@example.com',
      username: 'john',
      password: 'Password!',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password without uppercase letter', () => {
    const result = registerUserSchema.safeParse({
      email: 'test@example.com',
      username: 'john',
      password: 'password1!',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password without lowercase letter', () => {
    const result = registerUserSchema.safeParse({
      email: 'test@example.com',
      username: 'john',
      password: 'PASSWORD1!',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password shorter than 8 characters', () => {
    const result = registerUserSchema.safeParse({
      email: 'test@example.com',
      username: 'john',
      password: 'Pass1!',
    })
    expect(result.success).toBe(false)
  })

  it('reports complexity error message', () => {
    const result = registerUserSchema.safeParse({
      email: 'test@example.com',
      username: 'john',
      password: 'simple',
    })
    expect(result.success).toBe(false)
    const messages = result.error?.issues.map((i: { message: string }) => i.message) ?? []
    expect(messages).toContain('Password must include uppercase, lowercase, number, and special character')
  })
})

// ─── updateProfileSchema ─────────────────────────────────────
describe('updateProfileSchema', () => {
  it('accepts valid minimal profile data', () => {
    const result = updateProfileSchema.safeParse({
      username: 'john',
      email: 'john@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('accepts profile with optional fields', () => {
    const result = updateProfileSchema.safeParse({
      username: 'john',
      email: 'john@example.com',
      first_name: 'John',
      last_name: 'Doe',
      password_current: 'OldPass1!',
      password_new: 'NewPass1!',
    })
    expect(result.success).toBe(true)
  })

  it('accepts nullable optional fields', () => {
    const result = updateProfileSchema.safeParse({
      username: 'john',
      email: 'john@example.com',
      first_name: null,
      last_name: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = updateProfileSchema.safeParse({ username: 'john', email: 'not-email' })
    expect(result.success).toBe(false)
  })

  it('rejects short username', () => {
    const result = updateProfileSchema.safeParse({ username: 'ab', email: 'john@example.com' })
    expect(result.success).toBe(false)
  })

  it('rejects weak new password', () => {
    const result = updateProfileSchema.safeParse({
      username: 'john',
      email: 'john@example.com',
      password_new: 'weak',
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty string for password_current', () => {
    const result = updateProfileSchema.safeParse({
      username: 'john',
      email: 'john@example.com',
      password_current: '',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty string for password_new', () => {
    const result = updateProfileSchema.safeParse({
      username: 'john',
      email: 'john@example.com',
      password_new: '',
    })
    expect(result.success).toBe(true)
  })
})
