import {
  pgTable,
  serial,
  integer,
  varchar,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { countries } from "./location";

export const sources = pgTable(
  "sources",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 100 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),

    defaultLocale: varchar("default_locale", { length: 10 }),
    type: varchar("type", { length: 50 }), // e.g., 'aggregator', 'federation'
  },
  (table) => ({
    codeIndex: index("source_code_idx").on(table.code),

  })
);

export const insertSourceSchema = createInsertSchema(sources, {
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  defaultLocale: z.string().max(10).optional(),
  type: z.enum(["aggregator", "federation", "other"]).optional(),
});
export const sourceCountries = pgTable(
  "source_countries",
  {
    sourceId: integer("source_id").references(() => sources.id, { onDelete: "cascade" }).notNull(),
    countryId: integer("country_id").references(() => countries.id, { onDelete: "cascade" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.sourceId, table.countryId] }),
  })
);
