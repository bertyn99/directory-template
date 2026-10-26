ALTER TABLE "cities" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN "slug" varchar(255) GENERATED ALWAYS AS (slugify("cities"."name" || COALESCE('-' || "cities"."zip", ''))) STORED;--> statement-breakpoint
CREATE INDEX "city_slug_idx" ON "cities" ("slug");