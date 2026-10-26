import { eq, and } from 'drizzle-orm'
import { franchises } from '../schemas'
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
