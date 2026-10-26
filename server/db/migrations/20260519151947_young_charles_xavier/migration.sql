CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "normalized_name" text;--> statement-breakpoint
CREATE INDEX "venue_normalized_name_trgm_idx" ON "venues" USING gist ("normalized_name" gist_trgm_ops);