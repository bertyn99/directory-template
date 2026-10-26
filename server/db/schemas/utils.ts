import { sql } from "drizzle-orm";

export const createSlugifyFunction = sql`
CREATE OR REPLACE FUNCTION slugify("value" TEXT)
RETURNS TEXT AS $$
  WITH "unaccented" AS (
    SELECT unaccent("value") AS "value"
  ),
  "lowercased" AS (
    SELECT lower("value") AS "value"
    FROM "unaccented"
  ),
  "hyphenated" AS (
    SELECT regexp_replace("value", '[^a-z0-9\\-_]+', '-', 'gi') AS "value"
    FROM "lowercased"
  ),
  "single_hyphen" AS (
    SELECT regexp_replace("value", '-+', '-', 'g') AS "value"
    FROM "hyphenated"
  ),
  "trimmed" AS (
    SELECT trim(both '-' FROM "value") AS "value"
    FROM "single_hyphen"
  )
  SELECT "value" FROM "trimmed";
$$ LANGUAGE SQL STRICT IMMUTABLE;
`;

