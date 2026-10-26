// Lean data factories for the PGlite DB lane.
//
// Unlike the legacy factories in test/helpers/db-seeder.ts (written against a
// live Postgres setup that predates the rc migration layout), these omit every
// `generatedAlwaysAs` column (country/city/venue slugs are computed by SQL
// slugify()) and keep inserts minimal-but-valid for current schemas.
import { eq } from 'drizzle-orm'
import {
  accounts,
  activities,
  addresses,
  cities,
  venueActivities,
  venues,
  countries,
  franchises,
  venueCategories,
  users,
} from '../../../server/db/schemas'
import type { PgliteDatabase } from 'drizzle-orm/pglite'

type Db = PgliteDatabase<typeof relations>

let seq = 0

function uniqToken(prefix: string): string {
  seq += 1
  return `${prefix}-${seq}`
}

export async function seedCountry(
  db: Db,
  code: string,
  nameEn = `Country ${code}`,
) {
  const [row] = await db
    .insert(countries)
    .values({ code, name: nameEn })
    .onConflictDoNothing({ target: countries.code })
    .returning()

  if (row) return row

  const [existing] = await db
    .select()
    .from(countries)
    .where(eq(countries.code, code))
  return existing
}

export async function seedCity(
  db: Db,
  overrides: Partial<typeof cities.$inferInsert> & {
    countryCode?: string
  } = {},
) {
  const country = await seedCountry(db, overrides.countryCode ?? 'FR')
  const name = overrides.name ?? uniqToken('Ville')

  const [city] = await db
    .insert(cities)
    .values({
      name,
      countryId: country.id,
      zip: overrides.zip ?? '75001',
    })
    .returning()
  return city
}

export async function seedAddress(
  db: Db,
  overrides: Partial<typeof addresses.$inferInsert> = {},
) {
  let cityId = overrides.cityId
  if (!cityId) {
    cityId = (await seedCity(db)).id
  }

  const [address] = await db
    .insert(addresses)
    .values({
      street1: overrides.street1 ?? uniqToken('Street'),
      cityId,
      zip: overrides.zip ?? '75001',
      lat: overrides.lat ?? '48.8566',
      lng: overrides.lng ?? '2.3522',
    })
    .returning()
  return address
}

export async function seedVenue(
  db: Db,
  overrides: Partial<typeof venues.$inferInsert> & {
    addressCityId?: number
  } = {},
) {
  const name = overrides.name ?? uniqToken('Fight Gym')
  const values: typeof venues.$inferInsert = {
    name,
    normalizedName: overrides.normalizedName ?? name.toLowerCase(),
    statusCode: overrides.statusCode ?? 'active',
  }

  if (overrides.addressId !== undefined) {
    values.addressId = overrides.addressId
  } else if (overrides.addressCityId !== undefined) {
    values.addressId = (await seedAddress(db, { cityId: overrides.addressCityId })).id
  }
  if (overrides.addressId !== undefined) values.addressId = overrides.addressId
  if (overrides.categoryId !== undefined) values.categoryId = overrides.categoryId

  const [venue] = await db.insert(venues).values(values).returning()
  return venue
}

export async function seedType(db: Db, nameEn = uniqToken('Discipline')) {
  const [type] = await db.insert(venueCategories).values({ name: nameEn }).returning()
  return type
}

export async function seedActivity(db: Db, slug = uniqToken('discipline')) {
  const [activity] = await db
    .insert(activities)
    .values({ name: slug, slug })
    .returning()
  return activity
}

export async function linkVenueActivity(
  db: Db,
  venueId: number,
  activityId: number,
) {
  await db.insert(venueActivities).values({ venueId, activityId })
}

export async function seedUser(
  db: Db,
  overrides: Partial<typeof users.$inferInsert> = {},
) {
  const token = uniqToken('user')
  const [user] = await db
    .insert(users)
    .values({
      username: token,
      email: `${token}@example.com`,
      ...overrides,
    })
    .returning()
  return user
}

export async function seedAccount(
  db: Db,
  userId: string,
  providerAccountId = uniqToken('provider-account'),
) {
  const [account] = await db
    .insert(accounts)
    .values({
      provider: 'credentials' as const,
      providerAccountId,
      userId,
    })
    .returning()
  return account
}

export async function seedFranchise(
  db: Db,
  overrides: Partial<typeof franchises.$inferInsert> = {},
) {
  const token = uniqToken('Franchise')
  const [franchise] = await db
    .insert(franchises)
    .values({ name: token, ...overrides })
    .returning()
  return franchise
}
