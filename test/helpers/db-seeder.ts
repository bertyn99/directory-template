// test/helpers/db-seeder.ts
// Factory functions for creating test data in integration tests.
// Works with the transaction-based DB setup from test/setup/db.ts.

import {
  users,
  venues,
  cities,
  countries,
  addresses,
  venueCategories,
  userVenues,
  franchises,
} from "../../server/db/schemas";

type DbInstance = Parameters<
  Parameters<typeof users.$inferInsert extends never ? never : () => void>[0]
>[0] extends never
  ? never
  : Awaited<typeof import("../setup/db")>["db"];

/**
 * Create a test user. Returns the inserted user record.
 */
export async function createTestUser(
  db: DbInstance,
  overrides: Partial<typeof users.$inferInsert> = {},
) {
  const id = crypto.randomUUID();
  const [user] = await db
    .insert(users)
    .values({
      id,
      email: `test-${id.slice(0, 8)}@example.com`,
      username: `testuser_${id.slice(0, 8)}`,
      password: "$argon2id$v=19$m=65536,t=3,p=4$test$hash", // Pre-hashed for speed
      role: "user",
      ...overrides,
    })
    .returning();
  return user;
}

/**
 * Create a test venue with address. Returns the inserted venue record.
 */
export async function createTestVenue(
  db: DbInstance,
  overrides: Partial<typeof venues.$inferInsert> = {},
) {
  // Create a type if not provided
  let categoryId = overrides.categoryId;
  if (!categoryId) {
    const [type] = await db
      .insert(venueCategories)
      .values({
        name: { fr: `Test Type ${Date.now()}`, en: `Test Type ${Date.now()}` },
        slug: `test-type-${Date.now()}`,
      })
      .returning();
    categoryId = type.id;
  }

  const [venue] = await db
    .insert(venues)
    .values({
      name: `Test Venue ${Date.now()}`,
      slug: `test-venue-${Date.now()}`,
      categoryId,
      normalizedName: `test venue ${Date.now()}`,
      ...overrides,
    })
    .returning();
  return venue;
}

/**
 * Create a test city. Returns the inserted city record.
 */
export async function createTestCity(
  db: DbInstance,
  overrides: Partial<typeof cities.$inferInsert> = {},
) {
  // Create a country if not provided
  let countryId = overrides.countryId;
  if (!countryId) {
    const [country] = await db
      .insert(countries)
      .values({
        name: { fr: "France", en: "France" },
        code: "FR",
        slug: "france",
      })
      .returning();
    countryId = country.id;
  }

  const [city] = await db
    .insert(cities)
    .values({
      name: `Test City ${Date.now()}`,
      slug: `test-city-${Date.now()}`,
      countryId,
      normalizedName: `test city ${Date.now()}`,
      ...overrides,
    })
    .returning();
  return city;
}

/**
 * Create a test address. Returns the inserted address record.
 * Creates a city + country if not provided.
 */
export async function createTestAddress(
  db: DbInstance,
  overrides: Partial<typeof addresses.$inferInsert> = {},
) {
  let cityId = overrides.cityId;
  if (!cityId) {
    const city = await createTestCity(db);
    cityId = city.id;
  }

  const [address] = await db
    .insert(addresses)
    .values({
      street1: `Test Street ${Date.now()}`,
      cityId,
      zip: "75001",
      lat: "48.8566",
      lng: "2.3522",
      ...overrides,
    })
    .returning();
  return address;
}

/**
 * Create a test franchise. Returns the inserted franchise record.
 */
export async function createTestFranchise(
  db: DbInstance,
  overrides: Partial<typeof franchises.$inferInsert> = {},
) {
  const ts = Date.now();
  const [franchise] = await db
    .insert(franchises)
    .values({
      name: `Test Franchise ${ts}`,
      description: { fr: `Description FR ${ts}`, en: `Description EN ${ts}` },
      ...overrides,
    })
    .returning();
  return franchise;
}

/**
 * Link a user to a venue (owner relationship).
 */
export async function linkUserToVenue(
  db: DbInstance,
  userId: string,
  venueId: number,
  role: "owner" | "editor" = "owner",
) {
  const [link] = await db
    .insert(userVenues)
    .values({
      userId,
      venueId,
      role,
    })
    .returning();
  return link;
}
