import { eq, and, asc, sql } from 'drizzle-orm'
import { addresses, cities, countries, franchises, venues } from '../schemas'
import { useDrizzle } from '~~/server/utils/drizzle'
import type { InsertFranchise } from '~~/server/types'

export async function getFranchisesByOwnerId(ownerId: string) {
  const db = useDrizzle()
  return await db.query.franchises.findMany({
    where: { ownerId },
    orderBy: { name: 'asc' },
  })
}

export async function createFranchise(data: InsertFranchise) {
  const db = useDrizzle()
  const [newFranchise] = await db.insert(franchises)
    .values(data)
    .returning()
  return newFranchise
}

export async function updateFranchise(id: number, ownerId: string, data: Partial<InsertFranchise>) {
  const db = useDrizzle()
  const [updatedFranchise] = await db.update(franchises)
    .set(data)
    .where(and(
      eq(franchises.id, id),
      eq(franchises.ownerId, ownerId)
    ))
    .returning()
  return updatedFranchise
}

export async function deleteFranchise(id: number, ownerId: string) {
  const db = useDrizzle()
  const [deletedFranchise] = await db.delete(franchises)
    .where(and(
      eq(franchises.id, id),
      eq(franchises.ownerId, ownerId)
    ))
    .returning()
  return deletedFranchise
}

export async function getFranchiseByIdAndOwnerId(id: number, ownerId: string) {
  const db = useDrizzle()
  return await db.query.franchises.findFirst({
    where: { AND: [{ id }, { ownerId }] }
  })
}

/**
 * Public group page: a franchise is listed only when it has ≥1 venue with
 * statusCode = 'active' (the same public-listing gate as /venues). No
 * dedicated isPublic flag — v1 gates on live venues.
 */
export async function getPublicFranchiseBySlug(slug: string) {
  const db = useDrizzle()
  const franchise = await db.query.franchises.findFirst({
    where: { slug },
    columns: {
      id: true,
      name: true,
      slug: true,
      image: true,
      description: true,
      socialMedia: true,
    },
  })
  if (!franchise) return null

  const venueRows = await db
    .select({
      id: venues.id,
      name: venues.name,
      slug: venues.slug,
      searchPicture: venues.searchPicture,
      rating: venues.rating,
      address: {
        street1: addresses.street1,
        city: {
          name: cities.name,
          slug: cities.slug,
          zip: cities.zip,
          country: countries.name,
        },
      },
    })
    .from(venues)
    .leftJoin(addresses, eq(venues.addressId, addresses.id))
    .leftJoin(cities, eq(addresses.cityId, cities.id))
    .leftJoin(countries, eq(cities.countryId, countries.id))
    .where(and(
      eq(venues.franchiseId, franchise.id),
      eq(venues.statusCode, 'active'),
    ))
    .orderBy(asc(cities.name), asc(venues.name))

  if (venueRows.length === 0) return null

  return { ...franchise, venues: venueRows }
}

/** Sitemap: slugs of franchises that currently have ≥1 public venue. */
export async function getPublicFranchiseSlugs() {
  const db = useDrizzle()
  return db
    .select({
      slug: franchises.slug,
    })
    .from(franchises)
    .innerJoin(venues, eq(venues.franchiseId, franchises.id))
    .where(eq(venues.statusCode, 'active'))
    .groupBy(franchises.slug)
    .having(sql`count(${venues.id}) > 0`)
}
