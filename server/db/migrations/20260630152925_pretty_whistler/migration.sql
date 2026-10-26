CREATE INDEX "city_country_id_name_idx" ON "cities" ("country_id","name");--> statement-breakpoint
CREATE INDEX "country_slug_idx" ON "countries" ("slug");--> statement-breakpoint
CREATE INDEX "venue_activities_activity_id_idx" ON "venue_activities" ("activity_id");--> statement-breakpoint
CREATE INDEX "venue_slug_idx" ON "venues" ("slug");--> statement-breakpoint
CREATE INDEX "venue_status_idx" ON "venues" ("status");--> statement-breakpoint
CREATE INDEX "venue_address_id_idx" ON "venues" ("address_id");--> statement-breakpoint
CREATE INDEX "formulas_venue_id_idx" ON "formulas" ("venue_id");--> statement-breakpoint
CREATE INDEX "reviews_venue_id_created_at_idx" ON "reviews" ("venue_id","created_at");