CREATE TABLE IF NOT EXISTS "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"url" text,
	"image" text,
	"thematique_id" integer,
	CONSTRAINT "activities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) GENERATED ALWAYS AS (lower("cities"."name" || '-' || "cities"."zip")) STORED,
	"zip" varchar(20),
	"country" varchar(2),
	"lat" numeric(10, 8),
	"lng" numeric(11, 8)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer,
	"activity_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_equipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer,
	"equipment_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venues" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"category_id" integer,
	"franchise_id" integer,
	"city_id" integer,
	"sport_type" varchar(50) NOT NULL,
	"search_picture" text,
	"virtual_tour" text,
	"subscription" varchar(50),
	"description" jsonb,
	"website" text,
	"opening_hours" jsonb,
	"tel" varchar(20),
	"address" jsonb,
	"rating" jsonb,
	"shop" jsonb,
	"planning" jsonb,
	"txt_trial_button" text,
	"url" text,
	"url_city" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"social_media" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "equipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"location" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "formulas" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer,
	"type" varchar(50),
	"name" varchar(255),
	"infos" text,
	"price" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "franchises" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"day_order" integer,
	"activation" boolean,
	"is_home" boolean,
	"image" text,
	"url" text,
	"description" jsonb,
	"social_media" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "images" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer,
	"rating" integer NOT NULL,
	"comment" text,
	"reviewer_name" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "thematiques" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"url" text,
	"image" text,
	CONSTRAINT "thematiques_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venue_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"activation" boolean NOT NULL,
	"url" text,
	CONSTRAINT "venue_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activities" ADD CONSTRAINT "activities_thematique_id_thematiques_id_fk" FOREIGN KEY ("thematique_id") REFERENCES "public"."thematiques"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_activities" ADD CONSTRAINT "venue_activities_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_activities" ADD CONSTRAINT "venue_activities_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_equipments" ADD CONSTRAINT "venue_equipments_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_equipments" ADD CONSTRAINT "venue_equipments_equipment_id_equipments_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venues" ADD CONSTRAINT "venues_category_id_venue_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."venue_categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venues" ADD CONSTRAINT "venues_franchise_id_franchises_id_fk" FOREIGN KEY ("franchise_id") REFERENCES "public"."franchises"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venues" ADD CONSTRAINT "venues_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "formulas" ADD CONSTRAINT "formulas_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "images" ADD CONSTRAINT "images_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "city_name_idx" ON "cities" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "city_slug_idx" ON "cities" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venue_name_idx" ON "venues" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venue_city_id_idx" ON "venues" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venue_category_id_idx" ON "venues" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "venue_franchise_id_idx" ON "venues" USING btree ("franchise_id");