CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.slugify(
  v TEXT
) RETURNS TEXT
  LANGUAGE plpgsql
  STRICT IMMUTABLE AS
$function$
BEGIN
  -- 1. trim trailing and leading whitespaces from text
  -- 2. remove accents (diacritic signs) from a given text
  -- 3. lowercase unaccented text
  -- 4. replace non-alphanumeric (excluding hyphen, underscore) with a hyphen
  -- 5. trim leading and trailing hyphens
  RETURN trim(BOTH '-' FROM regexp_replace(lower(public.unaccent(trim(v))), '[^a-z0-9\\-_]+', '-', 'gi'));
END;
$function$;
--> statement-breakpoint

ALTER TABLE "activities" drop column "slug";
--> statement-breakpoint
ALTER TABLE "activities"
ADD COLUMN "slug" varchar(255) GENERATED ALWAYS AS (
    slugify (
        ("activities"."name") || '-' || "activities"."id"
    )
) STORED;
--> statement-breakpoint
ALTER TABLE "cities" drop column "slug";
--> statement-breakpoint
ALTER TABLE "cities"
ADD COLUMN "slug" varchar(255) GENERATED ALWAYS AS (
    slugify (
        "cities"."name" || '-' || "cities"."zip"
    )
) STORED;