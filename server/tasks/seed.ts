import { useDrizzle } from '#imports'
import { hashPassword } from '../utils/auth/password'
import { createUserWithCredentials } from '../db/queries/auth'

export default defineTask({
  meta: {
    name: 'db:seed',
    description: 'Seed database (use --user-only for just test user)'
  },
  async run({ payload }: { payload?: { mode?: string } }) {
    const mode = payload?.mode || 'user-only'

    if (mode !== 'user-only') {
      console.log('❌ Unknown mode. Use: pnpm task db:seed -- --mode=user-only')
      return { result: 'error', message: 'Invalid mode. Only user-only is supported.' }
    }

    const db = useDrizzle()

    console.log('🌱 Seeding test user only...')
    try {
      // 1. Check if test user already exists
      const existingUser = await db.query.users.findFirst({
        where: { email: 'test@example.com' }
      })

      if (existingUser) {
        console.log('✅ Test user already exists, skipping seed')
        return { result: 'skipped' }
      }

      // 2. Hash password for test user
      const hashedPassword = await hashPassword('TestPassword123')

      // 3. Create test user with credentials
      const testUser = await createUserWithCredentials(
        {
          email: 'test@example.com',
          username: 'testuser'
        },
        hashedPassword
      )

      console.log(`✅ Created test user: ${testUser.email}`)

      // 4. (Optional) Create additional seed data
      // Example: Create test franchise
      // const { franchises } = await import('~/server/db/schemas')
      // await db.insert(franchises).values({
      //   name: 'Test Venue',
      //   ownerId: testUser.id,
      //   isHome: true
      // })

      return { result: 'success', userId: testUser.id }
    } catch (error) {
      console.error('❌ Seed failed:', error)
      throw error
    }
  }
})
