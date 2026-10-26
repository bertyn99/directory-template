-- Seed activity IDs 17–35 (added for multi-provider & sportanize support)
-- IDs 17–26: generic martial arts activities (Kickboxing, MMA, etc.)
-- IDs 27–32: additional activities referenced in shared/activities.ts
-- IDs 33–35: Sportanize DE-specific (Wing Chun, Wing Tsun, Goshin Jitsu)

INSERT INTO "activities" ("id", "name", "slug", "thematique_id") VALUES
  (17, 'Kickboxing', 'kickboxing', NULL),
  (18, 'MMA', 'mma', NULL),
  (19, 'Muay Thai', 'muay-thai', NULL),
  (20, 'Boxing', 'boxing', NULL),
  (21, 'Grappling', 'grappling', NULL),
  (22, 'Wrestling', 'wrestling', NULL),
  (23, 'Capoeira', 'capoeira', NULL),
  (24, 'K1', 'k1', NULL),
  (25, 'Kung Fu', 'kung-fu', NULL),
  (26, 'Naginata', 'naginata', NULL),
  (27, 'Boxe Thaï', 'boxe-thai', NULL),
  (28, 'Lady Boxing', 'lady-boxing', NULL),
  (29, 'Kickboxen', 'kickboxen', NULL),
  (30, 'Thai-Boxen', 'thai-boxen', NULL),
  (31, 'Ringen', 'ringen', NULL),
  (32, 'Kampfsport', 'kampfsport', NULL),
  (33, 'Wing Chun', 'wing-chun', NULL),
  (34, 'Wing Tsun', 'wing-tsun', NULL),
  (35, 'Goshin Jitsu', 'goshin-jitsu', NULL)
ON CONFLICT (id) DO NOTHING;

-- Reset the sequence so auto-increment picks up after the highest ID
SELECT setval('activities_id_seq', (SELECT COALESCE(MAX(id), 0) FROM activities), true);
