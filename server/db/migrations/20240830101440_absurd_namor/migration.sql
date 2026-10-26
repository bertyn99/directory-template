ALTER TABLE "activities" DROP CONSTRAINT "activities_slug_unique";--> statement-breakpoint
ALTER TABLE "activities" ALTER COLUMN "slug" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" drop column "slug";--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "slug" varchar(255) GENERATED ALWAYS AS (lower("activities"."name" || '-' || "activities"."id")) STORED;--> statement-breakpoint
ALTER TABLE "venues" ALTER COLUMN "url" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "content" text;--> statement-breakpoint
ALTER TABLE "activities" DROP COLUMN IF EXISTS "url";--> statement-breakpoint
ALTER TABLE "venues" DROP COLUMN IF EXISTS "url_city";--> statement-breakpoint
ALTER TABLE "thematiques" DROP COLUMN IF EXISTS "url";