-- Seed activities with fixed IDs for hardcoded references
-- This migration ensures all known fighting styles exist with stable IDs
-- New activities start from ID 17

-- First, ensure the combat sports type exists
INSERT INTO "venue_categories" ("id", "name")
VALUES (1, 'Venue de fitness'), (2, 'Venue de sport art-martiaux / combat')
ON CONFLICT (id) DO NOTHING;

-- Seed all activities with explicit IDs
INSERT INTO "activities" ("id", "name", "thematique_id") VALUES
  -- Original 16 activities (existing data)
  (1, 'Viet Vo Dao', NULL),
  (2, 'Taekwondo', NULL),
  (3, 'Nihon Taï Jitsu', NULL),
  (4, 'Krav Maga', NULL),
  (5, 'Karaté', NULL),
  (6, 'Jujitsu', NULL),
  (7, 'Judo', NULL),
  (8, 'Boxe Française', NULL),
  (9, 'Boxe Anglaise', NULL),
  (10, 'Boxe Américaine', NULL),
  (11, 'Jujitsu Brésilien', NULL),
  (12, 'Aikido', NULL),
  (13, 'Boxe Chic', NULL),
  (14, 'Hapkido', NULL),
  (15, 'Taï Butou', NULL),
  (16, 'Vo Thuat', NULL),
  -- New activities for multi-provider support (ID 17+)
  (17, 'Kickboxing', NULL),
  (18, 'MMA', NULL),
  (19, 'Muay Thai', NULL),
  (20, 'Boxing', NULL),
  (21, 'Grappling', NULL),
  (22, 'Wrestling', NULL),
  (23, 'Capoeira', NULL),
  (24, 'K1', NULL),
  (25, 'Kung Fu', NULL),
  (26, 'Naginata', NULL)
ON CONFLICT (id) DO NOTHING;

-- Reset the sequence so auto-increment picks up after the highest ID
SELECT setval('activities_id_seq', (SELECT MAX(id) FROM activities), true);
--> statement-breakpoint

-- Reset venue_categories sequence too
SELECT setval('venue_categories_id_seq', (SELECT MAX(id) FROM venue_categories), true);
