// server/api/user-venues/create.post.ts

import { defineEventHandler } from "h3";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

import { userVenues, venues, addresses, insertVenueWithAddressSchema } from "~~/server/db/schemas";
import type { Venue } from "~~/server/types";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    // Validate the body using Zod schema
    const venueData = insertVenueWithAddressSchema.parse(body);

    // Get the user from the session
    const session = await getUserSession(event);
    if (!session || !session.user || !session.user?.username || !session.user?.id) {
      throw new Error("User not authenticated");
    }

    const db = useDrizzle(); // Initialize database connection

    const { address, ...venue } = venueData;

    // Use a transaction to ensure atomicity
    const insertedVenue = await db.transaction(async (tx) => {
      // Check if the address already exists
      const existingAddress = await tx.query.addresses.findFirst({
        where: {
          AND: [{ street1: address.street1 }, { cityId: address.cityId }, { zip: address.zip }],
        },
      });

      let addressId;
      if (existingAddress) {
        addressId = existingAddress.id;
      } else {
        // Insert the address data into the database
        const insertedAddress = await tx
          .insert(addresses)
          .values(address)
          .returning({ id: addresses.id });
        addressId = insertedAddress[0].id;
      }

      // Check if the venue already exists
      const existingVenue = await tx.query.venues.findFirst({
        where: { name: venueData.name },
      });

      if (existingVenue) {
        throw new Error("Venue already exists");
      }

      if (!venue.access) {
        venue.access = { fr: [], en: [], de: [], es: [], it: [], pt: [] };
      }
      // Insert the venue data into the database
      const insertedVenue = await tx
        .insert(venues)
        .values({
          ...venue,
          addressId,
        } as Venue)
        .returning({
          id: venues.id,
          name: venues.name,
          description: venues.description,
        });

      // Associate the venue with the user
      await tx.insert(userVenues).values({
        userId: session.user.id,
        venueId: insertedVenue[0].id,
      });

      return insertedVenue[0];
    });

    return { success: true, venue: insertedVenue };
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return createError({
        statusCode: 400,
        statusMessage: "Validation error",
        data: fromZodError(err).toString().split(";"),
      });
    }

    if (err instanceof Error) {
      console.error(err);
      return createError({
        statusCode: 500,
        statusMessage: err.message || "Failed to save venue",
      });
    }

    console.error(err);
    return createError({
      statusCode: 500,
      statusMessage: "Failed to save venue",
    });
  }
});
