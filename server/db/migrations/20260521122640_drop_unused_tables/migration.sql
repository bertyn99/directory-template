-- Drop over-engineered tables from scraping-matching-translation pipeline
-- raw_scrapes: unused staging table (venue_sources handles this)
-- venue_translations: JSONB on venues.description handles i18n directly
-- translation_memory: moved to Redis cache (useStorage)

DROP TABLE IF EXISTS "match_candidates" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "raw_scrapes" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "venue_translations" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "translation_memory" CASCADE;
--> statement-breakpoint

-- Recreate match_candidates with venue_source_id FK (was referencing raw_scrapes before)
CREATE TABLE "match_candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_source_id" integer NOT NULL,
	"existing_venue_id" integer NOT NULL,
	"score" numeric(3, 2) NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "match_candidates" ADD CONSTRAINT "match_candidates_venue_source_id_venue_sources_id_fk" FOREIGN KEY ("venue_source_id") REFERENCES "public"."venue_sources"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "match_candidates" ADD CONSTRAINT "match_candidates_existing_venue_id_venues_id_fk" FOREIGN KEY ("existing_venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "match_candidates" ADD CONSTRAINT "match_candidates_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "match_candidates_venue_source_id_idx" ON "match_candidates" USING btree ("venue_source_id");
--> statement-breakpoint
CREATE INDEX "match_candidates_existing_venue_id_idx" ON "match_candidates" USING btree ("existing_venue_id");
--> statement-breakpoint
CREATE INDEX "match_candidates_status_idx" ON "match_candidates" USING btree ("status");
