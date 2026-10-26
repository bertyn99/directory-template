import { eq } from "drizzle-orm";
import {
  activities,
  venueActivities,
  venueEquipments,
  equipments,
} from "~~/server/db/schemas";
import { useDrizzle } from "~~/server/utils/drizzle";

/**
 * Get all activities assigned to a venue (joined with activity names)
 */
export async function getVenueActivities(venueId: number) {
  return useDrizzle()
    .select({
      id: activities.id,
      name: activities.name,
      slug: activities.slug,
    })
    .from(venueActivities)
    .innerJoin(activities, eq(venueActivities.activityId, activities.id))
    .where(eq(venueActivities.venueId, venueId));
}

/**
 * Set (replace) all activities for a venue.
 * Deletes existing assignments then inserts new ones in a transaction.
 */
export async function setVenueActivities(
  venueId: number,
  activityIds: number[],
) {
  return useDrizzle().transaction(async (tx) => {
    await tx
      .delete(venueActivities)
      .where(eq(venueActivities.venueId, venueId));

    if (activityIds.length > 0) {
      await tx.insert(venueActivities).values(
        activityIds.map((activityId) => ({
          venueId,
          activityId,
        })),
      );
    }
  });
}

/**
 * Get all equipments assigned to a venue (joined with equipment names)
 */
export async function getVenueEquipments(venueId: number) {
  return useDrizzle()
    .select({
      id: equipments.id,
      name: equipments.name,
    })
    .from(venueEquipments)
    .innerJoin(equipments, eq(venueEquipments.equipmentId, equipments.id))
    .where(eq(venueEquipments.venueId, venueId));
}

/**
 * Set (replace) all equipments for a venue.
 * Deletes existing assignments then inserts new ones in a transaction.
 */
export async function setVenueEquipments(
  venueId: number,
  equipmentIds: number[],
) {
  return useDrizzle().transaction(async (tx) => {
    await tx
      .delete(venueEquipments)
      .where(eq(venueEquipments.venueId, venueId));

    if (equipmentIds.length > 0) {
      await tx.insert(venueEquipments).values(
        equipmentIds.map((equipmentId) => ({
          venueId,
          equipmentId,
        })),
      );
    }
  });
}

/**
 * Get all activities (for picker/selector UI)
 */
export async function getAllActivities() {
  return useDrizzle()
    .select({
      id: activities.id,
      name: activities.name,
      slug: activities.slug,
    })
    .from(activities);
}

/**
 * Get all equipments (for picker/selector UI)
 */
export async function getAllEquipments() {
  return useDrizzle()
    .select({
      id: equipments.id,
      name: equipments.name,
    })
    .from(equipments);
}
