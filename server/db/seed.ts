/**
 * Production Seed Script for Directory Template
 * 
 * Generates realistic test data for:
 * - Users (with hashed passwords)
 * - Countries & Cities (with coordinates)
 * - Venue Categories — DERIVED from directory.config.ts taxonomy
 * - Venues (with relationships to categories, equipment, franchises)
 * - Franchises (venue networks)
 * - Equipment & Formulas (pricing) — SAMPLE data
 * 
 * Usage: pnpm seed
 * 
 * NOTE on drizzle-seed: pinned to 1.0.0-rc.4 — the 0.x line imports
 * BaseSQLiteDatabase, which drizzle-orm 1.0.0-rc dropped from
 * drizzle-orm/sqlite-core (seed crashed at import).
 * 
 * Evidence:
 * - Password hashing: https://github.com/atinux/nuxt-auth-utils/blob/main/src/runtime/server/utils/password.ts
 * - Seed patterns: https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-seed/tests/northwind/pgTest.ts
 */

import { seed } from 'drizzle-seed'
import { eq, sql } from 'drizzle-orm'
import { hashPassword } from '../utils/auth/password'
import { loadEnvFile } from '../../scripts/load-env'
import { useDrizzle } from '../utils/drizzle'
import { directoryConfig } from '../../directory.config'
import * as schema from './schemas/index'

// drizzle-seed generates rows for EVERY table in the schema it receives.
// The scraping registry (sources / source_countries) is REAL data owned by
// the migration chain (20260511083452_seed_sources_and_countries) — exclude
// those two tables from the generator pass entirely: generated rows would
// collide with the migration-seeded PKs and their codes would not match the
// registered adapters. (Refining them to count: 0 is not enough — their FK
// generators still initialize against the empty pool and throw, and `false`
// is rejected for notNull columns.)
// `accounts` is excluded too: PHASE 3/4 create accounts explicitly for every
// generated user with real (provider, userId) pairs — randomly generated
// accounts claim overlapping pairs (provider is an enum, so 'credentials'
// collides) and the unique index accounts_provider_user_idx blows up.
const SEED_EXCLUDED_TABLES = new Set(['sources', 'sourceCountries', 'accounts'])
const seedSchema = Object.fromEntries(
  Object.entries(schema).filter(([name]) => !SEED_EXCLUDED_TABLES.has(name)),
) as typeof schema

// Standalone tsx script — no Nitro runtime here: .env is loaded manually
// (same pattern as scripts/bench-queries.ts) and useDrizzle comes from its
// module (NOT `#imports`, which tsx cannot resolve outside Nuxt).
loadEnvFile()

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

    await seed(db, seedSchema).refine((funcs) => ({
      // Users: 50 test users
      users: {
        count: 50,
        columns: {
          firstName: funcs.firstName({}),
          lastName: funcs.lastName({}),
          // drizzle-seed 1.0.0-rc dropped the `username` generator;
          // fullName on the unique column is auto-uniquified by the
          // framework (unique-constraint handling).
          username: funcs.fullName({}),
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

      // Categories: seeded explicitly in PHASE 2b from
      // directoryConfig.taxonomy (not sample data) — skipped here so the
      // explicit insert controls id order (see below).
      venueCategories: {
        count: 0,
      },

      // Franchises: Venue networks (optional). ownerId (uuid FK → users.id)
      // is left to drizzle-seed's FK resolution — an int generator breaks
      // against the uuid column.
      franchises: {
        count: 5,
        columns: {
          name: funcs.companyName({}),
          isHome: funcs.valuesFromArray({ values: [true, false] }),
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
          // lat/lng are TEXT columns — drizzle-seed 1.0.0-rc accepts only
          // generator objects in refinements (the 0.1.x `.toString()` hack
          // broke), so: sample coordinates of the 6 seed cities.
          lat: funcs.valuesFromArray({
            values: ['48.85661444', '45.76404300', '41.38740000', '52.52000800', '41.90280000', '38.72230000'],
          }),
          lng: funcs.valuesFromArray({
            values: ['2.35222190', '4.83565900', '2.16860000', '13.40495400', '12.49640000', '-9.13930000'],
          }),
        },
      },

      // Thematiques: venue category groupings (SAMPLE data — per-niche replace)
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

      // Activities: sample venue activities (SAMPLE data — per-niche replace)
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

      // Equipments: venue equipment (SAMPLE data — per-niche replace)
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

      // Venues: 40 sample venues. categoryId is assigned in PHASE 2b from
      // the taxonomy-derived venue_categories rows (NULL during the generator
      // pass — the category rows are inserted explicitly right after, so the
      // assignment can reference real ids). attributes is NULL during the
      // generator pass (drizzle-seed would generate random JSONB) and filled
      // deterministically from taxonomy.facets in PHASE 2d.
      venues: {
        count: 40,
        columns: {
          name: funcs.companyName({}),
          categoryId: funcs.default({ defaultValue: null }),
          attributes: funcs.default({ defaultValue: null }),
          franchiseId: funcs.valuesFromArray({
            values: [null, 1, 2, 3, 4, 5],
          }),
          subscription: funcs.valuesFromArray({
            // Plan vocabulary from directory.config.ts (billing) — was
            // hardcoded with an unknown 'elite' value the session type and
            // UI never recognized.
            values: ['free', ...directoryConfig.billing.plans.map((plan) => plan.id)],
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

      // Join tables (venueActivities / venueEquipments / userVenues) are
      // seeded deterministically in PHASE 2c below — their composite PKs /
      // unique pairs cannot be generated randomly without collisions
      // (drizzle-seed 1.0.0-rc does not dedupe pairs).
      venueActivities: {
        count: 0,
      },

      // Venue-Equipment relationships — deterministic, see PHASE 2c.
      venueEquipments: {
        count: 0,
      },

      // User-Venue relationships (memberships) — deterministic, see PHASE 2c
      // (unique (userId, venueId) pairs; userId is a uuid FK).
      userVenues: {
        count: 0,
      },
    }))

    console.log('✅ Seed data generated')

    // ============================================================================
    // PHASE 2b: CATEGORY TAXONOMY (derived from directory.config.ts)
    // ============================================================================
    console.log('\n🗂️  Phase 2b: Seeding category taxonomy...')

    // The venue_categories rows ARE the instantiation's taxonomy (not sample
    // data): one row per directoryConfig.taxonomy.categories entry, inserted
    // in config order. On a fresh DB the serial ids are therefore 1..N — the
    // same mapping taxonomy.seedIds documents for fixed-ID DBs.
    const taxonomyCategories = directoryConfig.taxonomy.categories
    if (taxonomyCategories.length === 0) {
      throw new Error('directoryConfig.taxonomy.categories is empty — a directory needs at least one category.')
    }

    const categoryRows = await db
      .insert(schema.venueCategories)
      .values(
        taxonomyCategories.map(category => ({
          name: category.labels.en ?? category.name,
          activation: true,
        })),
      )
      .returning({ id: schema.venueCategories.id, name: schema.venueCategories.name })

    // Spread venues deterministically across the seeded categories
    // (round-robin on the serial id). FK-safe for ANY taxonomy size,
    // including 1-category niches (padel) where every venue lands on the
    // single row — the previous hardcoded 1..8 range broke there.
    await db.execute(sql`
      UPDATE venues
      SET category_id = (
        SELECT vc.id
        FROM venue_categories vc
        ORDER BY vc.id
        OFFSET ((venues.id - 1) % (SELECT COUNT(*) FROM venue_categories))
        LIMIT 1
      )
      WHERE EXISTS (SELECT 1 FROM venue_categories)
    `)

    console.log(`✅ Categories seeded: ${categoryRows.map(row => row.name).join(', ')}`)

    // ============================================================================
    // PHASE 2c: JOIN TABLES (deterministic pairs)
    // ============================================================================
    console.log('\n🔗 Phase 2c: Seeding join tables...')

    // Composite PKs / unique pairs (venue_id+activity_id, venue_id+equipment_id,
    // user_id+venue_id) collide under random generation, so the pairs are
    // spread deterministically over the generated parent rows. Ids are read
    // back from the DB (order-stable), never assumed to be 1..N. A final
    // dedupe keeps tiny catalogs (1 activity, etc.) from self-colliding.
    const [venueIdRows, activityIdRows, equipmentIdRows, userIdRows] = await Promise.all([
      db.select({ id: schema.venues.id }).from(schema.venues).orderBy(schema.venues.id),
      db.select({ id: schema.activities.id }).from(schema.activities).orderBy(schema.activities.id),
      db.select({ id: schema.equipments.id }).from(schema.equipments).orderBy(schema.equipments.id),
      db.select({ id: schema.users.id }).from(schema.users).orderBy(schema.users.id),
    ])

    function dedupePairs<T extends { venueId?: unknown; userId?: unknown }>(
      rows: Array<T & { key: string }>,
    ): Array<T> {
      const seen = new Set<string>()
      return rows.flatMap(({ key, ...row }) => {
        if (seen.has(key)) return []
        seen.add(key)
        return [row as T]
      })
    }

    if (venueIdRows.length > 0 && activityIdRows.length > 0) {
      // 2 activities per venue, staggered so every (venue, activity) pair is unique.
      const venueActivitiesValues = dedupePairs(
        venueIdRows.flatMap((venue, vi) =>
          [0, 1].map((k) => ({
            venueId: venue.id,
            activityId: activityIdRows[(vi * 2 + k) % activityIdRows.length]?.id,
            key: `${venue.id}-${(vi * 2 + k) % activityIdRows.length}`,
          })),
        ),
      )
      await db.insert(schema.venueActivities).values(venueActivitiesValues)
    }

    if (venueIdRows.length > 0 && equipmentIdRows.length > 0) {
      // 3 equipments per venue, staggered across the equipment catalog.
      const venueEquipmentsValues = dedupePairs(
        venueIdRows.flatMap((venue, vi) =>
          [0, 1, 2].map((k) => ({
            venueId: venue.id,
            equipmentId: equipmentIdRows[(vi * 3 + k) % equipmentIdRows.length]?.id,
            key: `${venue.id}-${(vi * 3 + k) % equipmentIdRows.length}`,
          })),
        ),
      )
      await db.insert(schema.venueEquipments).values(venueEquipmentsValues)
    }

    if (userIdRows.length > 0 && venueIdRows.length > 0) {
      // 2 venue memberships per user, staggered so no pair repeats.
      const userVenuesValues = dedupePairs(
        userIdRows.flatMap((user, ui) =>
          [0, 1].map((k) => ({
            userId: user.id,
            venueId: venueIdRows[(ui * 2 + k) % venueIdRows.length]?.id,
            key: `${user.id}-${(ui * 2 + k) % venueIdRows.length}`,
          })),
        ),
      )
      await db.insert(schema.userVenues).values(userVenuesValues)
    }

    console.log('✅ Join tables seeded (venue_activities, venue_equipments, user_venues)')

    // ============================================================================
    // PHASE 2d: FACET ATTRIBUTES (deterministic, derived from directory.config.ts)
    // ============================================================================
    console.log('\n🏷️  Phase 2d: Seeding venue attributes...')

    // venues.attributes is SAMPLE data built from taxonomy.facets — the same
    // facets the public chips + filters render/filter, so a fresh dev DB has
    // data for every control. Values spread deterministically by venue index
    // (booleans alternate, enums rotate their whitelisted values), mirroring
    // how equipments/activities are spread in PHASE 2c.
    const facets = directoryConfig.taxonomy.facets
    if (facets.length > 0) {
      const venueRows = venueIdRows.length > 0
        ? venueIdRows
        : await db.select({ id: schema.venues.id }).from(schema.venues).orderBy(schema.venues.id)

      for (const [vi, venue] of venueRows.entries()) {
        const attributes: Record<string, unknown> = {}
        for (const [fi, facet] of facets.entries()) {
          if (facet.kind === 'boolean') {
            attributes[facet.key] = (vi + fi) % 2 === 0
          } else if (facet.kind === 'enum' && facet.values && facet.values.length > 0) {
            attributes[facet.key] = facet.values[(vi + fi) % facet.values.length]
          }
        }
        if (Object.keys(attributes).length > 0) {
          await db.update(schema.venues).set({ attributes }).where(eq(schema.venues.id, venue.id))
        }
      }
      console.log(`✅ Attributes seeded for ${venueRows.length} venues (${facets.length} facets)`)
    } else {
      console.log('ℹ️  No taxonomy.facets configured — skipping attribute seeding')
    }

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
