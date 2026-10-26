-- Seed country: United Kingdom (FR and DE assumed to exist already)
INSERT INTO "countries" ("name", "code")
VALUES ('United Kingdom', 'GB')
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint

-- Seed sources: all 4 aggregators linked to correct countries via subquery
INSERT INTO "sources" ("code", "name", "country_id", "default_locale", "type")
VALUES
  ('masalledesport', 'Ma Salle de Sport', (SELECT id FROM countries WHERE LOWER(code) = 'fr'), 'fr', 'aggregator'),
  ('fitnesspark', 'Fitness Park', (SELECT id FROM countries WHERE LOWER(code) = 'fr'), 'fr', 'aggregator'),
  ('combatvenue', 'Combat Venue', (SELECT id FROM countries WHERE LOWER(code) = 'gb'), 'en', 'aggregator'),
  ('sportanize', 'Sportanize', (SELECT id FROM countries WHERE LOWER(code) = 'de'), 'de', 'aggregator')
ON CONFLICT ("code") DO NOTHING;
