import { eq, and } from "drizzle-orm";
import { venues, events } from "~~/server/db/schemas";
import { useDrizzle } from "~~/server/utils/drizzle";
import type { InsertEvent } from "~~/server/types";

/**
 * Get all events for a specific venue
 */
export async function getVenueEvents(venueId: number) {
  return useDrizzle()
    .select()
    .from(events)
    .where(eq(events.venueId, venueId));
}

/**
 * Create a new event
 */
export async function createEvent(data: InsertEvent) {
  const [result] = await useDrizzle()
    .insert(events)
    .values(data)
    .returning();
  return result;
}

/**
 * Update an event scoped to a venue
 */
export async function updateEvent(
  id: number,
  venueId: number,
  data: Partial<InsertEvent>
) {
  const [result] = await useDrizzle()
    .update(events)
    .set(data)
    .where(and(eq(events.id, id), eq(events.venueId, venueId)))
    .returning();
  return result;
}

/**
 * Delete an event scoped to a venue
 */
export async function deleteEvent(id: number, venueId: number) {
  const [result] = await useDrizzle()
    .delete(events)
    .where(and(eq(events.id, id), eq(events.venueId, venueId)))
    .returning();
  return result;
}

/**
 * Get all events for venues belonging to a franchise
 */
export async function getFranchiseEvents(franchiseId: number) {
  return useDrizzle()
    .select({
      id: events.id,
      venueId: events.venueId,
      venueName: venues.name,
      name: events.name,
      description: events.description,
      startDate: events.startDate,
      endDate: events.endDate,
      location: events.location,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(eq(venues.franchiseId, franchiseId));
}
