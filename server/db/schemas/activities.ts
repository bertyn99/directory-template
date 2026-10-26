import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const thematiques = pgTable("thematiques", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  image: text("image"),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  content: jsonb("content").$type<Record<string, string>>(),
  equipments: jsonb("equipments").$type<Record<string, string[]>>(),
  keyPoints: jsonb("keyPoint").$type<Record<string, string[]>>(),
  competitions: jsonb("competitions").$type<Record<string, string[]>>(),
  techniques: jsonb("techniques").$type<Record<string, string[]>>(),
  history: jsonb("history").$type<Record<string, string>>(),
  stats: jsonb("stats").$type<Record<string, string>>(),
  faqs: jsonb("faqs").$type<Record<string, { question: string, answer: string }[]>>(),
  contraindications: jsonb("contraindications").$type<Record<string, { title: string, description: string }[]>>(),
  benefits: jsonb("benefits").$type<Record<string, { title: string, description: string }[]>>(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  slugs: jsonb("slugs").$type<Record<string, string>>().default({}),
  image: text("image"),
  thematiqueId: integer("thematique_id").references(() => thematiques.id, {
    onDelete: "cascade",
  }),
});

export const equipments = pgTable("equipments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
});

// venueActivities and venueEquipments are defined in venues.ts to avoid circular dependencies

export const insertEquipmentSchema = createInsertSchema(equipments);
export const insertActivitySchema = createInsertSchema(activities);

