-- Step 1: Re-link cities from duplicate countries to canonical ones
-- We want to keep the country that was created first (min id) for each UPPER(code)
WITH canonical_countries AS (
  SELECT UPPER(code) as upper_code, MIN(id) as canonical_id
  FROM countries
  GROUP BY UPPER(code)
)
UPDATE cities
SET country_id = canonical_countries.canonical_id
FROM countries
JOIN canonical_countries ON UPPER(countries.code) = canonical_countries.upper_code
WHERE cities.country_id = countries.id
  AND countries.id != canonical_countries.canonical_id;

-- Step 2: Re-link source_countries from duplicate countries to canonical ones
-- First delete any links that would cause a primary key violation
WITH canonical_countries AS (
  SELECT UPPER(code) as upper_code, MIN(id) as canonical_id
  FROM countries
  GROUP BY UPPER(code)
)
DELETE FROM source_countries sc1
USING countries c1, canonical_countries cc
WHERE sc1.country_id = c1.id
  AND UPPER(c1.code) = cc.upper_code
  AND c1.id != cc.canonical_id
  AND EXISTS (
    SELECT 1 FROM source_countries sc2
    WHERE sc2.source_id = sc1.source_id
      AND sc2.country_id = cc.canonical_id
  );

-- Then update the remaining ones
WITH canonical_countries AS (
  SELECT UPPER(code) as upper_code, MIN(id) as canonical_id
  FROM countries
  GROUP BY UPPER(code)
)
UPDATE source_countries
SET country_id = canonical_countries.canonical_id
FROM countries
JOIN canonical_countries ON UPPER(countries.code) = canonical_countries.upper_code
WHERE source_countries.country_id = countries.id
  AND countries.id != canonical_countries.canonical_id;

-- Step 3: Delete duplicate countries
WITH canonical_countries AS (
  SELECT UPPER(code) as upper_code, MIN(id) as canonical_id
  FROM countries
  GROUP BY UPPER(code)
)
DELETE FROM countries
WHERE id NOT IN (SELECT canonical_id FROM canonical_countries);

-- Step 4: Standardize codes to uppercase
UPDATE countries SET code = UPPER(code) WHERE code != UPPER(code);

-- Step 5: Update names to canonical English (for slug generation)
UPDATE countries SET name = 'France' WHERE code = 'FR';
UPDATE countries SET name = 'Germany' WHERE code = 'DE';
UPDATE countries SET name = 'United Kingdom' WHERE code = 'GB';
UPDATE countries SET name = 'Reunion' WHERE code = 'RE';
UPDATE countries SET name = 'Spain' WHERE code = 'ES';
UPDATE countries SET name = 'Italy' WHERE code = 'IT';
UPDATE countries SET name = 'Portugal' WHERE code = 'PT';
UPDATE countries SET name = 'Austria' WHERE code = 'AT';
UPDATE countries SET name = 'Switzerland' WHERE code = 'CH';
UPDATE countries SET name = 'Belgium' WHERE code = 'BE';
UPDATE countries SET name = 'Netherlands' WHERE code = 'NL';
