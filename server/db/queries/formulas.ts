import { eq, and } from "drizzle-orm";
import { formulas } from "~~/server/db/schemas";
import { useDrizzle } from "~~/server/utils/drizzle";

/**
 * Get all formulas for a venue
 */
export async function getVenueFormulas(venueId: number) {
  return useDrizzle()
    .select()
    .from(formulas)
    .where(eq(formulas.venueId, venueId));
}

/**
 * Create a new formula
 */
export async function createFormula(
  data: typeof formulas.$inferInsert,
) {
  const [result] = await useDrizzle()
    .insert(formulas)
    .values(data)
    .returning();
  return result;
}

/**
 * Update a formula scoped to a venue
 */
export async function updateFormula(
  id: number,
  venueId: number,
  data: Partial<Pick<typeof formulas.$inferInsert, "type" | "name" | "infos" | "price">>,
) {
  const [result] = await useDrizzle()
    .update(formulas)
    .set(data)
    .where(and(eq(formulas.id, id), eq(formulas.venueId, venueId)))
    .returning();
  return result ?? null;
}

/**
 * Delete a formula scoped to a venue
 */
export async function deleteFormula(id: number, venueId: number) {
  const [result] = await useDrizzle()
    .delete(formulas)
    .where(and(eq(formulas.id, id), eq(formulas.venueId, venueId)))
    .returning();
  return result ?? null;
}
