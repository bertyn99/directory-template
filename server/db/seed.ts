/**
 * Production Seed Script for Directory Template
 * 
 * Generates realistic test data for:
 * - Users (with hashed passwords)
 * - Countries & Cities (with coordinates)
 * - Venue Categories (Thematiques & Activities) — SAMPLE data
 * - Venues (with relationships to categories, equipment, franchises)
 * - Franchises (venue networks)
 * - Equipment & Formulas (pricing)
 * 
 * Usage: pnpm seed
 * 
 * Evidence:
 * - Password hashing: https://github.com/atinux/nuxt-auth-utils/blob/main/src/runtime/server/utils/password.ts
 * - Seed patterns: https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-seed/tests/northwind/pgTest.ts
 */

import { seed } from 'drizzle-seed'
import { hashPassword } from '../utils/auth/password'
import { sql } from 'drizzle-orm'
import { useDrizzle } from '#imports'
import * as schema from './schemas/index'

const db = useDrizzle()

async function main() {
  console.log('🌱 Starting seed for Directory Template...')

  try {
    // ============================================================================
    // PHASE 1: RESET TABLES (PostgreSQL CASCADE)
    // ============================================================================
    console.log('\n📋 Phase 1: Resetting tables...')

    // Reset in dependency order (children first, then parents)
    await db.execute(sql`TRUNCATE TABLE venue_activities CASCADE`)
    await db.execute(sql`TRUNCATE TABLE venue_equipments CASCADE`)
    await db.execute(sql`TRUNCATE TABLE user_venues CASCADE`)
    await db.execute(sql`TRUNCATE TABLE formulas CASCADE`)
    await db.execute(sql`TRUNCATE TABLE images CASCADE`)
    await db.execute(sql`TRUNCATE TABLE venues CASCADE`)
    await db.execute(sql`TRUNCATE TABLE activities CASCADE`)
    await db.execute(sql`TRUNCATE TABLE thematiques CASCADE`)
    await db.execute(sql`TRUNCATE TABLE addresses CASCADE`)
    await db.execute(sql`TRUNCATE TABLE cities CASCADE`)
    await db.execute(sql`TRUNCATE TABLE countries CASCADE`)
    await db.execute(sql`TRUNCATE TABLE franchises CASCADE`)
    await db.execute(sql`TRUNCATE TABLE venue_categories CASCADE`)
    await db.execute(sql`TRUNCATE TABLE equipments CASCADE`)
    await db.execute(sql`TRUNCATE TABLE users CASCADE`)

    console.log('✅ Tables reset')

    // ============================================================================
    // PHASE 2: GENERATE SEED DATA
    // ============================================================================
    console.log('\n🌱 Phase 2: Generating seed data...')

    await seed(db, schema).refine((funcs) => ({
      // Users: 50 test users
      users: {
        count: 50,
        columns: {
          firstName: funcs.firstName({}),
          lastName: funcs.lastName({}),
          username: funcs.username({}),
          email: funcs.email({}),
          stripeCustomerId: funcs.valuesFromArray({
            values: [null, 'cus_test_001', 'cus_test_002'],
          }),
        },
      },

      // Countries: 5 major countries
      countries: {
        count: 5,
        columns: {
          name: funcs.valuesFromArray({
            values: ['France', 'Germany', 'Spain', 'Italy', 'Belgium'],
          }),
          code: funcs.valuesFromArray({
            values: ['FR', 'DE', 'ES', 'IT', 'BE'],
          }),
        },
      },

      // Cities: 30 cities (6 per country)
      cities: {
        count: 30,
        columns: {
          name: funcs.city({}),
          zip: funcs.postcode({}),
          countryId: funcs.int({ minValue: 1, maxValue: 5 }),
          lat: funcs.number({ minValue: 40, maxValue: 55, precision: 100 }),
          lng: funcs.number({ minValue: -5, maxValue: 15, precision: 100 }),
        },
      },

      // Categories: generic venue categories (SAMPLE data — replace per instantiation)
      venueCategories: {
        count: 8,
        columns: {
          name: funcs.valuesFromArray({
            values: [
              'Fitness',
              'Yoga',
              'Spa',
              'Swimming',
              'Climbing',
              'Dance',
              'Pilates',
              'Wellness',
            ],
          }),
          activation: funcs.valuesFromArray({ values: [true, false] }),
        },
      },

      // Franchises: Venue networks (optional)
      franchises: {
        count: 5,
        columns: {
          name: funcs.companyName({}),
          isHome: funcs.valuesFromArray({ values: [true, false] }),
          ownerId: funcs.int({ minValue: 1, maxValue: 10 }),
        },
      },

      // Addresses: 40 addresses (for venues)
      addresses: {
        count: 40,
        columns: {
          street1: funcs.streetAddress({}),
          street2: funcs.valuesFromArray({
            values: [null, 'Apt 1', 'Suite 100', 'Floor 2'],
          }),
          cityId: funcs.int({ minValue: 1, maxValue: 30 }),
          zip: funcs.postcode({}),
          lat: funcs.number({ minValue: 40, maxValue: 55, precision: 100 }).toString(),
          lng: funcs.number({ minValue: -5, maxValue: 15, precision: 100 }).toString(),
        },
      },

      // Thematiques: venue category groupings (SAMPLE data)
      thematiques: {
        count: 5,
        columns: {
          name: funcs.valuesFromArray({
            values: [
              'Fitness',
              'Wellness',
              'Relaxation',
              'Group Classes',
              'Kids Activities',
            ],
          }),
          slug: funcs.valuesFromArray({
            values: [
              'fitness',
              'wellness',
              'relaxation',
              'group-classes',
              'kids-activities',
            ],
          }),
        },
      },

      // Activities: sample venue activities (SAMPLE data)
      activities: {
        count: 20,
        columns: {
          name: funcs.valuesFromArray({
            values: [
              'Beginner Fitness',
              'Advanced Yoga',
              'Pilates Fundamentals',
              'Aqua Conditioning',
              'Stretching & Mobility',
              'Spa Fundamentals',
              'Cardio Training',
              'Strength Basics',
              'Kids Fitness',
              'Adult Yoga',
              'Group Sessions',
              'Personal Coaching',
              'Flexibility & Mobility',
              'Technique Drills',
              'Performance Prep',
              'Wellness Workshop',
              'Yoga & Stretching',
              'Nutrition Seminar',
              'Mental Training',
              'Recovery & Massage',
            ],
          }),
          thematiqueId: funcs.int({ minValue: 1, maxValue: 5 }),
        },
      },

      // Equipments: venue equipment (SAMPLE data)
      equipments: {
        count: 12,
        columns: {
          name: funcs.valuesFromArray({
            values: [
              'Exercise Balls',
              'Foam Rollers',
              'Dumbbells',
              'Kettlebells',
              'Resistance Bands',
              'Treadmill',
              'Rowing Machine',
              'Pull-up Bar',
              'Yoga Mats',
              'Steam Room Kit',
              'Massage Table',
              'Sauna Kit',
            ],
          }),
        },
      },

      // Venues: 40 sample venues
      venues: {
        count: 40,
        columns: {
          name: funcs.companyName({}),
          categoryId: funcs.int({ minValue: 1, maxValue: 8 }),
          franchiseId: funcs.valuesFromArray({
            values: [null, 1, 2, 3, 4, 5],
          }),
          subscription: funcs.valuesFromArray({
            values: ['free', 'premium', 'elite'],
          }),
          website: funcs.valuesFromArray({
            values: [null, 'https://example.com', 'https://venue.com'],
          }),
          tel: funcs.phoneNumber({ template: '+33 # ## ## ## ##' }),
          addressId: funcs.int({ minValue: 1, maxValue: 40 }),
        },
      },

      // Formulas: Pricing plans
      formulas: {
        count: 30,
        columns: {
          venueId: funcs.int({ minValue: 1, maxValue: 40 }),
          type: funcs.valuesFromArray({
            values: ['monthly', 'quarterly', 'annual', 'drop-in'],
          }),
          name: funcs.valuesFromArray({
            values: [
              'Basic Plan',
              'Standard Plan',
              'Premium Plan',
              'VIP Plan',
              'Drop-in Pass',
            ],
          }),
          price: funcs.number({ minValue: 10, maxValue: 200, precision: 100 }),
        },
      },

      // Images: Venue photos
      images: {
        count: 50,
        columns: {
          venueId: funcs.int({ minValue: 1, maxValue: 40 }),
          url: funcs.valuesFromArray({
            values: [
              'https://example.com/venue1.jpg',
              'https://example.com/venue2.jpg',
              'https://example.com/venue3.jpg',
            ],
          }),
        },
      },

      // Venue-Activity relationships
      venueActivities: {
        count: 80,
        columns: {
          venueId: funcs.int({ minValue: 1, maxValue: 40 }),
          activityId: funcs.int({ minValue: 1, maxValue: 20 }),
        },
      },

      // Venue-Equipment relationships
      venueEquipments: {
        count: 100,
        columns: {
          venueId: funcs.int({ minValue: 1, maxValue: 40 }),
          equipmentId: funcs.int({ minValue: 1, maxValue: 12 }),
        },
      },

      // User-Venue relationships (memberships)
      userVenues: {
        count: 60,
        columns: {
          userId: funcs.int({ minValue: 1, maxValue: 50 }),
          venueId: funcs.int({ minValue: 1, maxValue: 40 }),
        },
      },
    }))

    console.log('✅ Seed data generated')

    // ============================================================================
    // PHASE 3: HASH PASSWORDS
    // ============================================================================
    console.log('\n🔐 Phase 3: Hashing passwords...')

    const testPassword = 'TestPassword123!'
    const hashedPassword = await hashPassword(testPassword)

    // Create accounts entries for all generated users with hashed passwords
    const allUsers = await db.query.users.findMany()
    const accountValues = allUsers.map(u => ({
      provider: 'credentials',
      providerAccountId: u.email,
      userId: u.id,
      hashedPassword: hashedPassword,
    }))
    await db.insert(schema.accounts).values(accountValues)

    console.log('✅ Passwords hashed and accounts created')

    // ============================================================================
    // PHASE 4: CREATE TEST ACCOUNTS
    // ============================================================================
    console.log('\n👤 Phase 4: Creating test accounts...')

    const adminHash = await hashPassword('AdminPassword123!')
    const userHash = await hashPassword('UserPassword123!')

    // Delete existing test accounts if they exist
    await db.delete(schema.users).where(
      sql`email IN ('admin@example.com', 'user@example.com', 'coach@example.com')`
    )

    // Create test users (without passwordHash — that goes in accounts table)
    const testUsers = await db.insert(schema.users).values([
      {
        firstName: 'Admin',
        lastName: 'User',
        username: 'admin',
        email: 'admin@example.com',
        stripeCustomerId: null,
        role: 'admin',
      },
      {
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        email: 'user@example.com',
        stripeCustomerId: null,
      },
      {
        firstName: 'Coach',
        lastName: 'Trainer',
        username: 'coach',
        email: 'coach@example.com',
        stripeCustomerId: null,
      },
    ]).returning({ id: schema.users.id, email: schema.users.email })

    // Create accounts entries with hashed passwords
    await db.insert(schema.accounts).values([
      {
        provider: 'credentials',
        providerAccountId: testUsers[0].email,
        userId: testUsers[0].id,
        hashedPassword: adminHash,
      },
      {
        provider: 'credentials',
        providerAccountId: testUsers[1].email,
        userId: testUsers[1].id,
        hashedPassword: userHash,
      },
      {
        provider: 'credentials',
        providerAccountId: testUsers[2].email,
        userId: testUsers[2].id,
        hashedPassword: userHash,
      },
    ])

    console.log('✅ Test accounts created')

    // ============================================================================
    // PHASE 5: VERIFICATION
    // ============================================================================
    console.log('\n✨ Phase 5: Verification...')

    const userCount = await db.query.users.findMany()
    const venueCount = await db.query.venues.findMany()
    const countryCount = await db.query.countries.findMany()
    const activityCount = await db.query.activities.findMany()

    console.log(`
📊 Seed Summary:
  ✅ Users: ${userCount.length}
  ✅ Venues: ${venueCount.length}
  ✅ Countries: ${countryCount.length}
  ✅ Activities: ${activityCount.length}

🔑 Test Accounts:
  📧 admin@example.com / AdminPassword123!
  📧 user@example.com / UserPassword123!
  📧 coach@example.com / UserPassword123!

🎯 Next Steps:
  1. Run: pnpm dev
  2. Navigate to: http://localhost:3000/auth/login
  3. Log in with test credentials above
  4. Explore the app with populated data
    `)

    console.log('✅ Seed complete!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

main()
