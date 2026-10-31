import {
  pgTable,
  serial,
  text,
  integer,
  varchar,
  jsonb,
  index,
  numeric,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { venues } from "./venues";
import { addresses } from "./location";
import type { SourceCode } from "~~/server/services/scraping/sources/registry";

export const venueSources = pgTable(
  "venue_sources",
  {
    id: serial("id").primaryKey(),
    sourceCode: varchar("source_code", { length: 100 }).notNull(),
    venueId: integer("venue_id").references(() => venues.id, {
      onDelete: "set null",
    }),
    sourceVenueId: varchar("source_venue_id", { length: 255 }),
    locale: varchar("locale", { length: 10 }),
    name: varchar("name", { length: 255 }),
    url: text("url"),
    website: text("website"),
    tel: varchar("tel", { length: 20 }),
    addressId: integer("address_id").references(() => addresses.id, {
      onDelete: "set null",
    }),
    raw: jsonb("raw"), // Full original payload
    matchScore: numeric("match_score", { precision: 3, scale: 2 }), // 0.00 to 1.00
    matchMethod: text("match_method"), // rule_phone, rule_website, rule_address, geocoding, ai, manual
    matchedAt: timestamp("matched_at", { withTimezone: true }),
    isPrimary: boolean("is_primary").default(false),
    trustScore: integer("trust_score"), // 0-100
  },
  (table) => [
    // Note: Unique constraints with nullable columns don't work as expected in PostgreSQL
    // We'll handle upserts manually in the ingestion service
    index("venue_sources_source_code_source_venue_id_idx").on(table.sourceCode, table.sourceVenueId),
    index("venue_sources_venue_id_idx").on(table.venueId),
    index("venue_sources_tel_idx").on(table.tel),
    index("venue_sources_website_idx").on(table.website),
    index("venue_sources_address_id_idx").on(table.addressId),
    index("venue_sources_source_url_idx").on(table.sourceCode, table.url),
  ],
);

export const insertVenueSourceSchema = createInsertSchema(venueSources, {
  sourceCode: z.enum([
    "masalledesport",
    "fitnesspark",
    "osm-overpass",
  ] as const satisfies readonly SourceCode[]),
  name: z.string().min(1).max(255).optional(),
  url: z.string().url().nullable().optional(),
  website: z.string().nullish(),
  tel: z.string().max(20).nullable().optional(),
  locale: z.string().max(10).optional(),
});
