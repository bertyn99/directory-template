-- Step 1: Drop the generated column constraint and recreate as regular varchar
-- PostgreSQL doesn't allow altering generated columns, so we drop and re-add
ALTER TABLE activities DROP COLUMN slug;
ALTER TABLE activities ADD COLUMN slug varchar(255);

-- Step 2: Populate slug from name (without ID suffix)
UPDATE activities SET slug = slugify(name);

-- Step 3: Make slug unique and not null
ALTER TABLE activities ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX activities_slug_unique ON activities(slug);

-- Step 4: Add slugs JSONB column
ALTER TABLE activities ADD COLUMN slugs jsonb DEFAULT '{}';

-- Step 5: Backfill slugs with French-only initially
UPDATE activities SET slugs = jsonb_build_object('fr', slugify(name));
