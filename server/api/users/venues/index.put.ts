// server/api/user-venues/create.post.ts

import { eq } from "drizzle-orm";

import { venues, addresses, insertVenueWithAddressSchema } from "~~/server/db/schemas";
import type { Venue } from "~~/server/types";

export default defineEventHandler(async (event) => {
  try {
    // Use readValidatedBody with Zod for consistent validation
    const venueData = await readValidatedBody(event, insertVenueWithAddressSchema.parse);
    // Get the user from the session
    const session = await requireUserSession(event);
    if (!session.user?.username || !session.user?.id) {
      throw createError({ statusCode: 401, statusMessage: "User not authenticated" });
    }

    const db = useDrizzle();

    const { address, ...venue } = venueData;

    // Owner-editable allowlist (audit M2 — mass assignment): the full insert
    // schema accepts system columns (statusCode, trustRank, isManuallyEdited,
    // slug, normalizedName…) that only the pipeline/admin may change. Strip
    // everything the owner is not allowed to set.
    const OWNER_EDITABLE_VENUE_FIELDS = new Set([
      "name",
      "description",
      "website",
      "bookingUrl",
      "bookingPartner",
      "tel",
      "phones",
      "socialMedia",
      "openingHours",
      "aliases",
      "searchPicture",
      "categoryId",
      "franchiseId",
    ]);
    const ownerVenue = Object.fromEntries(
      Object.entries(venue).filter(([key]) => OWNER_EDITABLE_VENUE_FIELDS.has(key)),
    );

    // Verify ownership via userVenues junction table
    const ownership = await db.query.userVenues.findFirst({
      where: { AND: [{ userId: session.user.id }, { venueId: venueData.id }] },
    });
    if (!ownership) throw createError({ statusCode: 403, statusMessage: "Forbidden" });

    const updatedVenue = await db.transaction(async (tx) => {
      // Check if the venue exists
      const existingVenue = await tx.query.venues.findFirst({
        where: { id: venueData.id },
      });

      if (!existingVenue) {
        throw createError({ statusCode: 404, statusMessage: "Venue not found" });
      }

      // Update the address
      let addressId = existingVenue.addressId;
      if (address) {
        const updatedAddress = await tx
          .update(addresses)
          .set(address)
          .where(eq(addresses.id, addressId))
          .returning({ id: addresses.id });
        addressId = updatedAddress[0].id;
      }

      const updatedVenueResult = await tx
        .update(venues)
        .set({
          ...ownerVenue,
          addressId,
        } as Venue)
        .where(eq(venues.id, venueData.id))
        .returning({
          id: venues.id,
          name: venues.name,
          description: venues.description,
        });

      return updatedVenueResult[0];
    });

    return { success: true, venue: updatedVenue };
  } catch (err: unknown) {
    // Re-throw H3Errors as-is
    if (err && typeof err === "object" && "statusCode" in err) {
      throw err;
    }

    console.error(err);
    throw createError({
      statusCode: 500,
      statusMessage: err instanceof Error ? err.message : "Failed to save venue",
    });
  }
});
