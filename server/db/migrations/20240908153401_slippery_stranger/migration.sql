ALTER TABLE "venue_categories" DROP CONSTRAINT "venue_categories_slug_unique";--> statement-breakpoint
ALTER TABLE "venue_categories" ALTER COLUMN "slug" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "venue_categories" drop column "slug";--> statement-breakpoint
ALTER TABLE "venue_categories" ADD COLUMN "slug" varchar(255) GENERATED ALWAYS AS (slugify("venue_categories"."name")) STORED;--> statement-breakpoint
ALTER TABLE "franchises" ADD COLUMN "slug" varchar(255) GENERATED ALWAYS AS (slugify("franchises"."name")) STORED;--> statement-breakpoint
ALTER TABLE "franchises" DROP COLUMN IF EXISTS "day_order";--> statement-breakpoint
ALTER TABLE "franchises" DROP COLUMN IF EXISTS "activation";--> statement-breakpoint
ALTER TABLE "franchises" DROP COLUMN IF EXISTS "url";