ALTER TABLE "activities" DROP CONSTRAINT "activities_thematique_id_thematiques_id_fk";
--> statement-breakpoint
ALTER TABLE "addresses" DROP CONSTRAINT "addresses_city_id_cities_id_fk";
--> statement-breakpoint
ALTER TABLE "cities" DROP CONSTRAINT "cities_country_id_countries_id_fk";
--> statement-breakpoint
ALTER TABLE "venue_activities" DROP CONSTRAINT "venue_activities_venue_id_venues_id_fk";
--> statement-breakpoint
ALTER TABLE "venue_activities" DROP CONSTRAINT "venue_activities_activity_id_activities_id_fk";
--> statement-breakpoint
ALTER TABLE "venue_equipments" DROP CONSTRAINT "venue_equipments_venue_id_venues_id_fk";
--> statement-breakpoint
ALTER TABLE "venue_equipments" DROP CONSTRAINT "venue_equipments_equipment_id_equipments_id_fk";
--> statement-breakpoint
ALTER TABLE "venues" DROP CONSTRAINT "venues_category_id_venue_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "venues" DROP CONSTRAINT "venues_franchise_id_franchises_id_fk";
--> statement-breakpoint
ALTER TABLE "venues" DROP CONSTRAINT "venues_address_id_addresses_id_fk";
--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT "events_venue_id_venues_id_fk";
--> statement-breakpoint
ALTER TABLE "formulas" DROP CONSTRAINT "formulas_venue_id_venues_id_fk";
--> statement-breakpoint
ALTER TABLE "images" DROP CONSTRAINT "images_venue_id_venues_id_fk";
--> statement-breakpoint
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_venue_id_venues_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activities" ADD CONSTRAINT "activities_thematique_id_thematiques_id_fk" FOREIGN KEY ("thematique_id") REFERENCES "public"."thematiques"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "addresses" ADD CONSTRAINT "addresses_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_activities" ADD CONSTRAINT "venue_activities_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_activities" ADD CONSTRAINT "venue_activities_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_equipments" ADD CONSTRAINT "venue_equipments_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venue_equipments" ADD CONSTRAINT "venue_equipments_equipment_id_equipments_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venues" ADD CONSTRAINT "venues_category_id_venue_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."venue_categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venues" ADD CONSTRAINT "venues_franchise_id_franchises_id_fk" FOREIGN KEY ("franchise_id") REFERENCES "public"."franchises"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "venues" ADD CONSTRAINT "venues_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "formulas" ADD CONSTRAINT "formulas_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "images" ADD CONSTRAINT "images_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
