-- Merge French Guiana (GF) into France (FR).
-- Guyane française is a French overseas region, not a country. The Fitness Park
-- scraper returned addressCountry "GF" (JSON-LD), which created a ghost country
-- row named "GF" and surfaced a bogus card on the countries page.
--
-- normalize.ts now remaps French overseas codes (GF, GP, MQ, …) to FR, so this
-- migration only cleans up the existing data.
--
-- Order matters: cities must be re-linked BEFORE deleting the country, because
-- cities.country_id ON DELETE CASCADE would otherwise wipe Macouria, its
-- addresses, and orphan the venues pointing at them.

-- Step 1: Re-link cities from GF to the canonical FR country (id 1)
UPDATE cities
SET country_id = (SELECT id FROM countries WHERE code = 'FR')
WHERE country_id = (SELECT id FROM countries WHERE code = 'GF');

-- Step 2: Re-link source_countries the same way (no-op if already linked)
DELETE FROM source_countries
WHERE country_id = (SELECT id FROM countries WHERE code = 'GF')
  AND source_id IN (
    SELECT source_id FROM source_countries
    WHERE country_id = (SELECT id FROM countries WHERE code = 'FR')
  );

UPDATE source_countries
SET country_id = (SELECT id FROM countries WHERE code = 'FR')
WHERE country_id = (SELECT id FROM countries WHERE code = 'GF');

-- Step 3: Drop the ghost country
DELETE FROM countries WHERE code = 'GF';
