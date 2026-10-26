-- Merge duplicate activities (translations/romanizations of same martial art)
-- Uses slug-based matching so it works regardless of ID differences between dev/prod
-- Canonical activity keeps its row; duplicates remap venueActivities then get deleted

-- ============================================================
-- Duplicate mapping (slug-based):
--   kickboxing   ←  kickboxen (German)
--   muay-thai    ←  boxe-thai (French), thai-boxen (German)
--   wrestling    ←  ringen (German)
--   wing-chun    ←  wing-tsun (romanization variant)
--   (none)       ←  kampfsport (generic German "martial arts", not a real style)
-- ============================================================

-- Helper: resolve slug → id (safe, returns NULL if slug doesn't exist)
-- This makes the migration idempotent and production-safe

-- Step 1: Remap venueActivities from duplicate → canonical
-- Handle potential PK conflicts: delete canonical row first if both exist for same venue

-- kickboxen → kickboxing
DELETE FROM venue_activities
WHERE activity_id = (SELECT id FROM activities WHERE slug = 'kickboxing')
  AND venue_id IN (
    SELECT venue_id FROM venue_activities
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'kickboxen')
  );
UPDATE venue_activities
SET activity_id = (SELECT id FROM activities WHERE slug = 'kickboxing')
WHERE activity_id = (SELECT id FROM activities WHERE slug = 'kickboxen');

-- boxe-thai → muay-thai
DELETE FROM venue_activities
WHERE activity_id = (SELECT id FROM activities WHERE slug = 'muay-thai')
  AND venue_id IN (
    SELECT venue_id FROM venue_activities
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'boxe-thai')
  );
UPDATE venue_activities
SET activity_id = (SELECT id FROM activities WHERE slug = 'muay-thai')
WHERE activity_id = (SELECT id FROM activities WHERE slug = 'boxe-thai');

-- thai-boxen → muay-thai
DELETE FROM venue_activities
WHERE activity_id = (SELECT id FROM activities WHERE slug = 'muay-thai')
  AND venue_id IN (
    SELECT venue_id FROM venue_activities
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'thai-boxen')
  );
UPDATE venue_activities
SET activity_id = (SELECT id FROM activities WHERE slug = 'muay-thai')
WHERE activity_id = (SELECT id FROM activities WHERE slug = 'thai-boxen');

-- ringen → wrestling
DELETE FROM venue_activities
WHERE activity_id = (SELECT id FROM activities WHERE slug = 'wrestling')
  AND venue_id IN (
    SELECT venue_id FROM venue_activities
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'ringen')
  );
UPDATE venue_activities
SET activity_id = (SELECT id FROM activities WHERE slug = 'wrestling')
WHERE activity_id = (SELECT id FROM activities WHERE slug = 'ringen');

-- wing-tsun → wing-chun
DELETE FROM venue_activities
WHERE activity_id = (SELECT id FROM activities WHERE slug = 'wing-chun')
  AND venue_id IN (
    SELECT venue_id FROM venue_activities
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'wing-tsun')
  );
UPDATE venue_activities
SET activity_id = (SELECT id FROM activities WHERE slug = 'wing-chun')
WHERE activity_id = (SELECT id FROM activities WHERE slug = 'wing-tsun');

-- kampfsport → no canonical (generic term, just remove the links)
DELETE FROM venue_activities
WHERE activity_id = (SELECT id FROM activities WHERE slug = 'kampfsport');

-- Step 2: Add localized slugs to canonical activities
-- So translated URLs still resolve to the canonical activity
UPDATE activities SET slugs = COALESCE(slugs, '{}'::jsonb) || '{"de": "kickboxen"}'::jsonb
  WHERE slug = 'kickboxing' AND slugs->>'de' IS NULL;

UPDATE activities SET slugs = COALESCE(slugs, '{}'::jsonb) || '{"fr": "boxe-thai", "de": "thai-boxen"}'::jsonb
  WHERE slug = 'muay-thai' AND slugs->>'fr' IS NULL;

UPDATE activities SET slugs = COALESCE(slugs, '{}'::jsonb) || '{"de": "ringen"}'::jsonb
  WHERE slug = 'wrestling' AND slugs->>'de' IS NULL;

UPDATE activities SET slugs = COALESCE(slugs, '{}'::jsonb) || '{"de": "wing-tsun"}'::jsonb
  WHERE slug = 'wing-chun' AND slugs->>'de' IS NULL;

-- Step 3: Delete duplicate activity rows
DELETE FROM activities WHERE slug IN ('kickboxen', 'boxe-thai', 'thai-boxen', 'ringen', 'wing-tsun', 'kampfsport');
