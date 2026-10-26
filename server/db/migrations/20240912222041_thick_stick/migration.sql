ALTER TABLE "venue_categories" ALTER COLUMN "activation" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "venue_categories" DROP COLUMN IF EXISTS "url";