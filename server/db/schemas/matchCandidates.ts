import {
  pgTable,
  serial,
  integer,
  varchar,
  decimal,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { venueSources } from "./venueSources";
import { venues } from "./venues";
import { users } from "./auth";

export const matchCandidates = pgTable(
  "match_candidates",
  {
    id: serial("id").primaryKey(),
    venueSourceId: integer("venue_source_id")
      .notNull()
      .references(() => venueSources.id),
    existingVenueId: integer("existing_venue_id")
      .notNull()
      .references(() => venues.id),
    score: decimal("score", { precision: 3, scale: 2 }).notNull(),
    statusCode: varchar("status", { length: 50 }).notNull().default("PENDING"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at"),
  },
  (table) => ({
    venueSourceIdIndex: index("match_candidates_venue_source_id_idx").on(table.venueSourceId),
    existingVenueIdIndex: index("match_candidates_existing_venue_id_idx").on(
      table.existingVenueId,
    ),
    statusIndex: index("match_candidates_status_idx").on(table.statusCode),
  }),
);

export const insertMatchCandidateSchema = createInsertSchema(matchCandidates, {
  score: z.string().regex(/^(0\.\d{2}|1\.00)$/),
  statusCode: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
});
