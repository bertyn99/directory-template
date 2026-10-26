CREATE TABLE "source_countries" (
	"source_id" integer NOT NULL,
	"country_id" integer NOT NULL,
	CONSTRAINT "source_countries_source_id_country_id_pk" PRIMARY KEY("source_id","country_id")
);
--> statement-breakpoint
ALTER TABLE "sources" DROP CONSTRAINT "sources_country_id_countries_id_fk";
--> statement-breakpoint
DROP INDEX "source_country_id_idx";--> statement-breakpoint
ALTER TABLE "source_countries" ADD CONSTRAINT "source_countries_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_countries" ADD CONSTRAINT "source_countries_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "source_countries" ("source_id", "country_id") SELECT "id", "country_id" FROM "sources" WHERE "country_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" DROP COLUMN "country_id";