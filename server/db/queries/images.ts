import { eq, and } from "drizzle-orm";
import { venues, images } from "~~/server/db/schemas";
import { useDrizzle } from "~~/server/utils/drizzle";

/**
 * Get all images for a venue
 */
export async function getVenueImages(venueId: number) {
  return useDrizzle()
    .select()
    .from(images)
    .where(eq(images.venueId, venueId));
}

/**
 * Add an image to a venue
 */
export async function addImage(venueId: number, url: string) {
  const [inserted] = await useDrizzle()
    .insert(images)
    .values({ venueId, url })
    .returning();
  return inserted;
}

/**
 * Delete an image scoped to a venue
 */
export async function deleteImage(id: number, venueId: number) {
  const [deleted] = await useDrizzle()
    .delete(images)
    .where(and(eq(images.id, id), eq(images.venueId, venueId)))
    .returning();
  return deleted ?? null;
}

/**
 * Set the search picture for a venue
 */
export async function setVenueSearchPicture(venueId: number, url: string) {
  const [updated] = await useDrizzle()
    .update(venues)
    .set({ searchPicture: url })
    .where(eq(venues.id, venueId))
    .returning();
  return updated ?? null;
}
