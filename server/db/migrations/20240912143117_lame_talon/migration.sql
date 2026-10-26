ALTER TABLE "addresses" ADD COLUMN "lat" text;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "lng" text;--> statement-breakpoint
ALTER TABLE "addresses" DROP COLUMN IF EXISTS "latitude";--> statement-breakpoint
ALTER TABLE "addresses" DROP COLUMN IF EXISTS "longitude";