import {
  pgTable,
  primaryKey,
  serial,
  text,
  integer,
  jsonb,
  timestamp,
  varchar,
  decimal,
  index,
  uuid,
} from "drizzle-orm/pg-core";
import type { SQL} from "drizzle-orm";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { venueCategories, franchises } from "./core";
import { users } from "./auth";
import { addresses, insertAddressSchema } from "./location";

export const venues = pgTable(
  "venues",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).generatedAlwaysAs(
      (): SQL => sql`slugify(${venues.name})`
    ),
    categoryId: integer("category_id").references(() => venueCategories.id, {
      onDelete: "cascade",
    }),
    franchiseId: integer("franchise_id").references(() => franchises.id, {
      onDelete: "set null",
    }),
    searchPicture: text("search_picture"),
    subscription: varchar("subscription", { length: 50 }),
    description: jsonb("description").$type<Record<string, { text: string; intro: string }>>(),
    website: text("website"),
    openingHours: jsonb("opening_hours"),
    tel: varchar("tel", { length: 20 }),
    addressId: integer("address_id").references(() => addresses.id, {
      onDelete: "set null",
    }),
    rating: jsonb("rating"),
    access: jsonb("access").$type<Record<string, unknown[]>>(),
    shop: jsonb("shop"),
    planning: jsonb("planning"),
    txtTrialButton: text("txt_trial_button"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    socialMedia: jsonb("social_media"),
    aliases: jsonb("aliases").$type<Array<{
      name: string;
      locale?: string;
      source?: string;
    }>>(),
    phones: text("phones").array(),
    lastSeenAt: timestamp("last_seen_at"),
    statusCode: text("status").default('active').$type<'active' | 'closed' | 'removed_by_owner'>(),
    canonicalPhone: varchar("canonical_phone", { length: 20 }),
    trustRank: integer("trust_rank").default(0),
    isManuallyEdited: jsonb("is_manually_edited").$type<Record<string, boolean>>().default({}),
    normalizedName: text("normalized_name"),
  },
  (table) => [
    index("venue_name_idx").on(table.name),
    index("venue_slug_idx").on(table.slug),
    index("venue_status_idx").on(table.statusCode),
    index("venue_address_id_idx").on(table.addressId),
    index("venue_normalized_name_trgm_idx").using("gist", sql`${table.normalizedName} gist_trgm_ops`),
  ],
);

export const userVenues = pgTable(
  "user_venues",
  {
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    venueId: integer("venue_id").references(() => venues.id, {
      onDelete: "cascade",
    }),
  },
  (table) => ({
    pk_user_venues: primaryKey({
      name: "pk_user_venues",
      columns: [table.userId, table.venueId],
    }),
  })
);

export const formulas = pgTable(
  "formulas",
  {
    id: serial("id").primaryKey(),
    venueId: integer("venue_id").references(() => venues.id, {
      onDelete: "cascade",
    }),
    type: varchar("type", { length: 50 }),
    name: varchar("name", { length: 255 }),
    infos: text("infos"),
    price: decimal("price", { precision: 10, scale: 2 }),
  },
  (table) => [index("formulas_venue_id_idx").on(table.venueId)],
);

export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").references(() => venues.id, {
    onDelete: "cascade",
  }),
  url: text("url").notNull(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").references(() => venues.id, {
    onDelete: "cascade",
  }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  location: jsonb("location"),
});

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    venueId: integer("venue_id").references(() => venues.id, {
      onDelete: "cascade",
    }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    reviewerName: varchar("reviewer_name", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("reviews_venue_id_created_at_idx").on(table.venueId, table.createdAt),
  ],
);

// Junction tables - defined here to avoid circular dependencies
// These reference activities/equipments which are defined in activities.ts
export const venueActivities = pgTable(
  "venue_activities",
  {
    venueId: integer("venue_id")
      .notNull()
      .references(() => venues.id, {
        onDelete: "cascade",
      }),
    activityId: integer("activity_id").notNull(),
  },
  (table) => [
    primaryKey({ name: "pk_venue_activities", columns: [table.venueId, table.activityId] }),
    index("venue_activities_activity_id_idx").on(table.activityId),
  ],
);

export const venueEquipments = pgTable(
  "venue_equipments",
  {
    venueId: integer("venue_id")
      .notNull()
      .references(() => venues.id, {
        onDelete: "cascade",
      }),
    equipmentId: integer("equipment_id").notNull(),
  },
  (table) => {
    return [primaryKey({ name: "pk_venue_equipments", columns: [table.venueId, table.equipmentId] })]
  }
);

// Relations will be defined in index.ts to avoid circular dependencies

export const insertVenueSchema = createInsertSchema(venues, {
  name: z.string().min(2),
  tel: z.string().min(8),
  website: z.string().url().optional(),
});

export const insertVenueWithAddressSchema = insertVenueSchema.extend({
  address: insertAddressSchema,
});

