CREATE TABLE IF NOT EXISTS "addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"street1" varchar(255) NOT NULL,
	"street2" varchar(255),
	"city_id" integer NOT NULL,
	"zip" varchar(20) NOT NULL,
	"latitude" text,
	"longitude" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(2) NOT NULL,
	"slug" varchar(255) GENERATED ALWAYS AS (slugify("countries"."name")) STORED
);
--> statement-breakpoint
ALTER TABLE "venues" DROP CONSTRAINT "venues_city_id_cities_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "venue_city_id_idx";--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN "country_id" integer;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "slug" varchar(255) GENERATED ALWAYS AS (slugify("venues"."name")) STORED;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "address_id" integer;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "access" jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "addresses" ADD CONSTRAINT "addresses_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "city_idx" ON "addresses" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "country_name_idx" ON "countries" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "country_code_idx" ON "countries" USING btree ("code");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venues" ADD CONSTRAINT "venues_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "city_country_id_idx" ON "cities" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venue_address_id_idx" ON "venues" USING btree ("address_id");--> statement-breakpoint
ALTER TABLE "cities" DROP COLUMN IF EXISTS "country";--> statement-breakpoint
ALTER TABLE "venues" DROP COLUMN IF EXISTS "city_id";--> statement-breakpoint
ALTER TABLE "venues" DROP COLUMN IF EXISTS "virtual_tour";--> statement-breakpoint
ALTER TABLE "venues" DROP COLUMN IF EXISTS "address";--> statement-breakpoint
ALTER TABLE "venues" DROP COLUMN IF EXISTS "url";