CREATE TABLE "venue_sources" (
    "id" serial PRIMARY KEY NOT NULL,
    "source_code" varchar(100) NOT NULL,
    "venue_id" integer,
    "source_venue_id" varchar(255),
    "locale" varchar(10),
    "name" varchar(255),
    "url" text,
    "website" text,
    "tel" varchar(20),
    "address_id" integer,
    "raw" jsonb
);
--> statement-breakpoint
CREATE TABLE "sources" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" varchar(100) NOT NULL,
    "name" varchar(255) NOT NULL,
    "country_id" integer,
    "default_locale" varchar(10),
    "type" varchar(50),
    CONSTRAINT "sources_code_unique" UNIQUE ("code")
);
--> statement-breakpoint
ALTER TABLE "venue_activities"
DROP CONSTRAINT "venue_activities_activity_id_activities_id_fk";
--> statement-breakpoint
ALTER TABLE "venue_equipments"
DROP CONSTRAINT "venue_equipments_equipment_id_equipments_id_fk";
--> statement-breakpoint
ALTER TABLE "venue_activities" ALTER COLUMN "venue_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "venue_activities"
ALTER COLUMN "activity_id"
SET
    NOT NULL;
--> statement-breakpoint
ALTER TABLE "venue_equipments" ALTER COLUMN "venue_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "venue_equipments"
ALTER COLUMN "equipment_id"
SET
    NOT NULL;
--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "aliases" jsonb;
--> statement-breakpoint
UPDATE "venues"
SET
    "aliases" = jsonb_build_array (
        jsonb_build_object (
            'name',
            "name",
            'locale',
            'fr',
            'source',
            'masalledesport'
        )
    )
WHERE
    "aliases" IS NULL;
--> statement-breakpoint
ALTER TABLE "venue_sources" ADD CONSTRAINT "venue_sources_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "venue_sources" ADD CONSTRAINT "venue_sources_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "venue_sources_source_code_source_venue_id_idx" ON "venue_sources" USING btree (
    "source_code",
    "source_venue_id"
);
--> statement-breakpoint
CREATE INDEX "venue_sources_venue_id_idx" ON "venue_sources" USING btree ("venue_id");
--> statement-breakpoint
CREATE INDEX "venue_sources_tel_idx" ON "venue_sources" USING btree ("tel");
--> statement-breakpoint
CREATE INDEX "venue_sources_website_idx" ON "venue_sources" USING btree ("website");
--> statement-breakpoint
CREATE INDEX "venue_sources_address_id_idx" ON "venue_sources" USING btree ("address_id");
--> statement-breakpoint
CREATE INDEX "venue_sources_source_url_idx" ON "venue_sources" USING btree ("source_code", "url");
--> statement-breakpoint
CREATE INDEX "source_code_idx" ON "sources" USING btree ("code");
--> statement-breakpoint
CREATE INDEX "source_country_id_idx" ON "sources" USING btree ("country_id");