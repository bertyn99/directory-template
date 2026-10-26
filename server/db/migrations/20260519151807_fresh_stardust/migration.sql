CREATE TABLE "venue_translations" (
	"venue_id" integer NOT NULL,
	"locale" text NOT NULL,
	"description" text,
	"schedule_text" text,
	"source_hash" text,
	"translated_at" timestamp DEFAULT now(),
	"is_manual" boolean DEFAULT false,
	CONSTRAINT "pk_venue_translations" PRIMARY KEY("venue_id","locale")
);
--> statement-breakpoint
CREATE TABLE "raw_scrapes" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_code" varchar(100) NOT NULL,
	"raw_name" varchar(255),
	"raw_phone" varchar(50),
	"raw_address" text,
	"raw_lat" varchar(50),
	"raw_lng" varchar(50),
	"raw_website" text,
	"raw_description" jsonb,
	"raw_styles" jsonb,
	"raw" jsonb,
	"scraped_at" timestamp DEFAULT now(),
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"scrape_id" integer NOT NULL,
	"existing_venue_id" integer NOT NULL,
	"score" numeric(3, 2) NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "phones" text[];--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "last_seen_at" timestamp;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "status" text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "canonical_phone" varchar(20);--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "trust_rank" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "is_manually_edited" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "venue_sources" ADD COLUMN "match_score" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "venue_sources" ADD COLUMN "match_method" text;--> statement-breakpoint
ALTER TABLE "venue_sources" ADD COLUMN "matched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "venue_sources" ADD COLUMN "is_primary" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "venue_sources" ADD COLUMN "trust_score" integer;--> statement-breakpoint
ALTER TABLE "venue_translations" ADD CONSTRAINT "venue_translations_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_candidates" ADD CONSTRAINT "match_candidates_scrape_id_raw_scrapes_id_fk" FOREIGN KEY ("scrape_id") REFERENCES "public"."raw_scrapes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_candidates" ADD CONSTRAINT "match_candidates_existing_venue_id_venues_id_fk" FOREIGN KEY ("existing_venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_candidates" ADD CONSTRAINT "match_candidates_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_candidates_scrape_id_idx" ON "match_candidates" USING btree ("scrape_id");--> statement-breakpoint
CREATE INDEX "match_candidates_existing_venue_id_idx" ON "match_candidates" USING btree ("existing_venue_id");--> statement-breakpoint
CREATE INDEX "match_candidates_status_idx" ON "match_candidates" USING btree ("status");