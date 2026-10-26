import { pgTable, serial, text, varchar, boolean, jsonb, uuid } from "drizzle-orm/pg-core";
import type { SQL} from "drizzle-orm";
import { sql } from "drizzle-orm";
import { users } from "./auth";

export const venueCategories = pgTable("venue_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).generatedAlwaysAs(
    (): SQL => sql`slugify(${venueCategories.name})`
  ),
  activation: boolean("activation"),
});

export const franchises = pgTable("franchises", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  isHome: boolean("is_home"),
  image: text("image"),
  slug: varchar("slug", { length: 255 }).generatedAlwaysAs(
    (): SQL => sql`slugify(${franchises.name})`
  ),
  description: jsonb("description"),
  socialMedia: jsonb("social_media"),
  ownerId: uuid("owner_id").references(() => users.id, {
    onDelete: "set null",
  }),
});

// Relations will be defined in index.ts to avoid circular dependencies
