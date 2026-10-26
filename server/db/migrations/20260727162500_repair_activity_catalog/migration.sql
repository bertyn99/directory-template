-- Repair activity catalog by SLUG (never by id — ids differ between local and prod).
--
-- Prod reality (verified):
--   kickboxing missing, only kickboxen (29)
--   muay-thai is id 14 (not 19), boxe-thai/thai-boxen are aliases
--   French styles use French primary slugs (boxe-francaise, …)
--
-- Strategy:
--   1) Promote alias → canonical English slug when canonical is missing
--   2) Merge alias into canonical when both exist
--   3) Normalize English name + locale slugs jsonb on whatever row remains
-- Idempotent.

-- ============================================================
-- Helpers as DO blocks so missing rows are no-ops
-- ============================================================

-- ---------- Kickboxing: promote kickboxen if needed, else merge ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM activities WHERE slug = 'kickboxen')
     AND NOT EXISTS (SELECT 1 FROM activities WHERE slug = 'kickboxing') THEN
    UPDATE activities
    SET name = 'Kickboxing', slug = 'kickboxing'
    WHERE slug = 'kickboxen';
  ELSIF EXISTS (SELECT 1 FROM activities WHERE slug = 'kickboxen')
     AND EXISTS (SELECT 1 FROM activities WHERE slug = 'kickboxing') THEN
    DELETE FROM venue_activities
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'kickboxing' LIMIT 1)
      AND venue_id IN (
        SELECT venue_id FROM venue_activities
        WHERE activity_id = (SELECT id FROM activities WHERE slug = 'kickboxen' LIMIT 1)
      );
    UPDATE venue_activities
    SET activity_id = (SELECT id FROM activities WHERE slug = 'kickboxing' LIMIT 1)
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'kickboxen' LIMIT 1);
    DELETE FROM activities WHERE slug = 'kickboxen';
  END IF;
END $$;

-- ---------- Muay Thai: merge boxe-thai / thai-boxen; promote if needed ----------
DO $$
BEGIN
  -- Promote boxe-thai → muay-thai if no muay-thai
  IF EXISTS (SELECT 1 FROM activities WHERE slug = 'boxe-thai')
     AND NOT EXISTS (SELECT 1 FROM activities WHERE slug = 'muay-thai') THEN
    UPDATE activities SET name = 'Muay Thai', slug = 'muay-thai' WHERE slug = 'boxe-thai';
  END IF;

  -- Promote thai-boxen → muay-thai if still no muay-thai
  IF EXISTS (SELECT 1 FROM activities WHERE slug = 'thai-boxen')
     AND NOT EXISTS (SELECT 1 FROM activities WHERE slug = 'muay-thai') THEN
    UPDATE activities SET name = 'Muay Thai', slug = 'muay-thai' WHERE slug = 'thai-boxen';
  END IF;

  -- Merge remaining aliases into muay-thai
  IF EXISTS (SELECT 1 FROM activities WHERE slug = 'muay-thai') THEN
    IF EXISTS (SELECT 1 FROM activities WHERE slug = 'boxe-thai') THEN
      DELETE FROM venue_activities
      WHERE activity_id = (SELECT id FROM activities WHERE slug = 'muay-thai' LIMIT 1)
        AND venue_id IN (
          SELECT venue_id FROM venue_activities
          WHERE activity_id = (SELECT id FROM activities WHERE slug = 'boxe-thai' LIMIT 1)
        );
      UPDATE venue_activities
      SET activity_id = (SELECT id FROM activities WHERE slug = 'muay-thai' LIMIT 1)
      WHERE activity_id = (SELECT id FROM activities WHERE slug = 'boxe-thai' LIMIT 1);
      DELETE FROM activities WHERE slug = 'boxe-thai';
    END IF;

    IF EXISTS (SELECT 1 FROM activities WHERE slug = 'thai-boxen') THEN
      DELETE FROM venue_activities
      WHERE activity_id = (SELECT id FROM activities WHERE slug = 'muay-thai' LIMIT 1)
        AND venue_id IN (
          SELECT venue_id FROM venue_activities
          WHERE activity_id = (SELECT id FROM activities WHERE slug = 'thai-boxen' LIMIT 1)
        );
      UPDATE venue_activities
      SET activity_id = (SELECT id FROM activities WHERE slug = 'muay-thai' LIMIT 1)
      WHERE activity_id = (SELECT id FROM activities WHERE slug = 'thai-boxen' LIMIT 1);
      DELETE FROM activities WHERE slug = 'thai-boxen';
    END IF;
  END IF;
END $$;

-- ---------- Wrestling: promote/merge ringen ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM activities WHERE slug = 'ringen')
     AND NOT EXISTS (SELECT 1 FROM activities WHERE slug = 'wrestling') THEN
    UPDATE activities SET name = 'Wrestling', slug = 'wrestling' WHERE slug = 'ringen';
  ELSIF EXISTS (SELECT 1 FROM activities WHERE slug = 'ringen')
     AND EXISTS (SELECT 1 FROM activities WHERE slug = 'wrestling') THEN
    DELETE FROM venue_activities
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'wrestling' LIMIT 1)
      AND venue_id IN (
        SELECT venue_id FROM venue_activities
        WHERE activity_id = (SELECT id FROM activities WHERE slug = 'ringen' LIMIT 1)
      );
    UPDATE venue_activities
    SET activity_id = (SELECT id FROM activities WHERE slug = 'wrestling' LIMIT 1)
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'ringen' LIMIT 1);
    DELETE FROM activities WHERE slug = 'ringen';
  END IF;
END $$;

-- ---------- Wing Chun: promote/merge wing-tsun ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM activities WHERE slug = 'wing-tsun')
     AND NOT EXISTS (SELECT 1 FROM activities WHERE slug = 'wing-chun') THEN
    UPDATE activities SET name = 'Wing Chun', slug = 'wing-chun' WHERE slug = 'wing-tsun';
  ELSIF EXISTS (SELECT 1 FROM activities WHERE slug = 'wing-tsun')
     AND EXISTS (SELECT 1 FROM activities WHERE slug = 'wing-chun') THEN
    DELETE FROM venue_activities
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'wing-chun' LIMIT 1)
      AND venue_id IN (
        SELECT venue_id FROM venue_activities
        WHERE activity_id = (SELECT id FROM activities WHERE slug = 'wing-tsun' LIMIT 1)
      );
    UPDATE venue_activities
    SET activity_id = (SELECT id FROM activities WHERE slug = 'wing-chun' LIMIT 1)
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'wing-tsun' LIMIT 1);
    DELETE FROM activities WHERE slug = 'wing-tsun';
  END IF;
END $$;

-- ---------- MMA: promote mma-mixed-martial-arts → mma if needed ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM activities WHERE slug = 'mma-mixed-martial-arts')
     AND NOT EXISTS (SELECT 1 FROM activities WHERE slug = 'mma') THEN
    UPDATE activities SET name = 'MMA', slug = 'mma' WHERE slug = 'mma-mixed-martial-arts';
  ELSIF EXISTS (SELECT 1 FROM activities WHERE slug = 'mma-mixed-martial-arts')
     AND EXISTS (SELECT 1 FROM activities WHERE slug = 'mma') THEN
    DELETE FROM venue_activities
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'mma' LIMIT 1)
      AND venue_id IN (
        SELECT venue_id FROM venue_activities
        WHERE activity_id = (SELECT id FROM activities WHERE slug = 'mma-mixed-martial-arts' LIMIT 1)
      );
    UPDATE venue_activities
    SET activity_id = (SELECT id FROM activities WHERE slug = 'mma' LIMIT 1)
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'mma-mixed-martial-arts' LIMIT 1);
    DELETE FROM activities WHERE slug = 'mma-mixed-martial-arts';
  END IF;
END $$;

-- ---------- French primary slugs → English canonical (prod uses boxe-francaise, etc.) ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM activities WHERE slug = 'boxe-francaise')
     AND NOT EXISTS (SELECT 1 FROM activities WHERE slug = 'french-boxing') THEN
    UPDATE activities SET name = 'French Boxing', slug = 'french-boxing' WHERE slug = 'boxe-francaise';
  ELSIF EXISTS (SELECT 1 FROM activities WHERE slug = 'boxe-francaise')
     AND EXISTS (SELECT 1 FROM activities WHERE slug = 'french-boxing') THEN
    DELETE FROM venue_activities
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'french-boxing' LIMIT 1)
      AND venue_id IN (
        SELECT venue_id FROM venue_activities
        WHERE activity_id = (SELECT id FROM activities WHERE slug = 'boxe-francaise' LIMIT 1)
      );
    UPDATE venue_activities
    SET activity_id = (SELECT id FROM activities WHERE slug = 'french-boxing' LIMIT 1)
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'boxe-francaise' LIMIT 1);
    DELETE FROM activities WHERE slug = 'boxe-francaise';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM activities WHERE slug = 'boxe-anglaise')
     AND NOT EXISTS (SELECT 1 FROM activities WHERE slug = 'english-boxing') THEN
    UPDATE activities SET name = 'English Boxing', slug = 'english-boxing' WHERE slug = 'boxe-anglaise';
  ELSIF EXISTS (SELECT 1 FROM activities WHERE slug = 'boxe-anglaise')
     AND EXISTS (SELECT 1 FROM activities WHERE slug = 'english-boxing') THEN
    DELETE FROM venue_activities
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'english-boxing' LIMIT 1)
      AND venue_id IN (
        SELECT venue_id FROM venue_activities
        WHERE activity_id = (SELECT id FROM activities WHERE slug = 'boxe-anglaise' LIMIT 1)
      );
    UPDATE venue_activities
    SET activity_id = (SELECT id FROM activities WHERE slug = 'english-boxing' LIMIT 1)
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'boxe-anglaise' LIMIT 1);
    DELETE FROM activities WHERE slug = 'boxe-anglaise';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM activities WHERE slug = 'boxe-americaine')
     AND NOT EXISTS (SELECT 1 FROM activities WHERE slug = 'american-boxing') THEN
    UPDATE activities SET name = 'American Boxing', slug = 'american-boxing' WHERE slug = 'boxe-americaine';
  ELSIF EXISTS (SELECT 1 FROM activities WHERE slug = 'boxe-americaine')
     AND EXISTS (SELECT 1 FROM activities WHERE slug = 'american-boxing') THEN
    DELETE FROM venue_activities
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'american-boxing' LIMIT 1)
      AND venue_id IN (
        SELECT venue_id FROM venue_activities
        WHERE activity_id = (SELECT id FROM activities WHERE slug = 'boxe-americaine' LIMIT 1)
      );
    UPDATE venue_activities
    SET activity_id = (SELECT id FROM activities WHERE slug = 'american-boxing' LIMIT 1)
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'boxe-americaine' LIMIT 1);
    DELETE FROM activities WHERE slug = 'boxe-americaine';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM activities WHERE slug = 'boxe-chic')
     AND NOT EXISTS (SELECT 1 FROM activities WHERE slug = 'chic-boxing') THEN
    UPDATE activities SET name = 'Chic Boxing', slug = 'chic-boxing' WHERE slug = 'boxe-chic';
  ELSIF EXISTS (SELECT 1 FROM activities WHERE slug = 'boxe-chic')
     AND EXISTS (SELECT 1 FROM activities WHERE slug = 'chic-boxing') THEN
    DELETE FROM venue_activities
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'chic-boxing' LIMIT 1)
      AND venue_id IN (
        SELECT venue_id FROM venue_activities
        WHERE activity_id = (SELECT id FROM activities WHERE slug = 'boxe-chic' LIMIT 1)
      );
    UPDATE venue_activities
    SET activity_id = (SELECT id FROM activities WHERE slug = 'chic-boxing' LIMIT 1)
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'boxe-chic' LIMIT 1);
    DELETE FROM activities WHERE slug = 'boxe-chic';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM activities WHERE slug = 'jujitsu-bresilien')
     AND NOT EXISTS (SELECT 1 FROM activities WHERE slug = 'brazilian-jiu-jitsu') THEN
    UPDATE activities SET name = 'Brazilian Jiu-Jitsu', slug = 'brazilian-jiu-jitsu' WHERE slug = 'jujitsu-bresilien';
  ELSIF EXISTS (SELECT 1 FROM activities WHERE slug = 'jujitsu-bresilien')
     AND EXISTS (SELECT 1 FROM activities WHERE slug = 'brazilian-jiu-jitsu') THEN
    DELETE FROM venue_activities
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'brazilian-jiu-jitsu' LIMIT 1)
      AND venue_id IN (
        SELECT venue_id FROM venue_activities
        WHERE activity_id = (SELECT id FROM activities WHERE slug = 'jujitsu-bresilien' LIMIT 1)
      );
    UPDATE venue_activities
    SET activity_id = (SELECT id FROM activities WHERE slug = 'brazilian-jiu-jitsu' LIMIT 1)
    WHERE activity_id = (SELECT id FROM activities WHERE slug = 'jujitsu-bresilien' LIMIT 1);
    DELETE FROM activities WHERE slug = 'jujitsu-bresilien';
  END IF;
END $$;

-- ---------- Drop generic / junk styles ----------
DELETE FROM venue_activities
WHERE activity_id IN (
  SELECT id FROM activities WHERE slug IN ('kampfsport', 'mma-fight-ness-gym', 'aleop-fight')
);
DELETE FROM activities
WHERE slug IN ('kampfsport', 'mma-fight-ness-gym', 'aleop-fight');

-- ============================================================
-- Normalize English name + locale slugs on remaining rows (by slug).
-- Primary activities.slug is always the English canonical key.
-- ============================================================

UPDATE activities SET name = 'Kickboxing',
  slugs = jsonb_build_object(
    'en', 'kickboxing', 'fr', 'kick-boxing', 'de', 'kickboxen',
    'es', 'kickboxing', 'it', 'kickboxing', 'pt', 'kickboxing'
  )
WHERE slug IN ('kickboxing', 'kickboxen');

UPDATE activities SET name = 'Muay Thai',
  slugs = jsonb_build_object(
    'en', 'muay-thai', 'fr', 'boxe-thai', 'de', 'thai-boxen',
    'es', 'muay-thai', 'it', 'muay-thai', 'pt', 'muay-thai'
  )
WHERE slug IN ('muay-thai', 'boxe-thai', 'thai-boxen');

UPDATE activities SET name = 'Wrestling',
  slugs = jsonb_build_object(
    'en', 'wrestling', 'fr', 'lutte', 'de', 'ringen',
    'es', 'lucha', 'it', 'lotta', 'pt', 'luta'
  )
WHERE slug IN ('wrestling', 'ringen');

UPDATE activities SET name = 'Wing Chun',
  slugs = jsonb_build_object(
    'en', 'wing-chun', 'fr', 'wing-chun', 'de', 'wing-chun',
    'es', 'wing-chun', 'it', 'wing-chun', 'pt', 'wing-chun'
  )
WHERE slug IN ('wing-chun', 'wing-tsun');

UPDATE activities SET name = 'MMA',
  slugs = jsonb_build_object(
    'en', 'mma', 'fr', 'mma', 'de', 'mma',
    'es', 'mma', 'it', 'mma', 'pt', 'mma'
  )
WHERE slug IN ('mma', 'mma-mixed-martial-arts');

UPDATE activities SET name = 'French Boxing',
  slugs = jsonb_build_object(
    'en', 'french-boxing', 'fr', 'boxe-francaise', 'de', 'franzosisches-boxen',
    'es', 'boxeo-frances', 'it', 'pugilato-francese', 'pt', 'boxe-francesa'
  )
WHERE slug IN ('french-boxing', 'boxe-francaise');

UPDATE activities SET name = 'English Boxing',
  slugs = jsonb_build_object(
    'en', 'english-boxing', 'fr', 'boxe-anglaise', 'de', 'englisches-boxen',
    'es', 'boxeo-ingles', 'it', 'pugilato-inglese', 'pt', 'boxe-inglesa'
  )
WHERE slug IN ('english-boxing', 'boxe-anglaise');

UPDATE activities SET name = 'American Boxing',
  slugs = jsonb_build_object(
    'en', 'american-boxing', 'fr', 'boxe-americaine', 'de', 'amerikanisches-boxen',
    'es', 'boxeo-americano', 'it', 'pugilato-americano', 'pt', 'boxe-americana'
  )
WHERE slug IN ('american-boxing', 'boxe-americaine');

UPDATE activities SET name = 'Chic Boxing',
  slugs = jsonb_build_object(
    'en', 'chic-boxing', 'fr', 'boxe-chic', 'de', 'chic-boxen',
    'es', 'boxeo-chic', 'it', 'pugilato-chic', 'pt', 'boxe-chic'
  )
WHERE slug IN ('chic-boxing', 'boxe-chic');

UPDATE activities SET name = 'Brazilian Jiu-Jitsu',
  slugs = jsonb_build_object(
    'en', 'brazilian-jiu-jitsu', 'fr', 'jujitsu-bresilien', 'de', 'brasilianisches-jujitsu',
    'es', 'jiu-jitsu-brasileno', 'it', 'jiu-jitsu-brasiliano', 'pt', 'jiu-jitsu-brasileiro'
  )
WHERE slug IN ('brazilian-jiu-jitsu', 'jujitsu-bresilien');

UPDATE activities SET name = 'Karate',
  slugs = jsonb_build_object(
    'en', 'karate', 'fr', 'karate', 'de', 'karate',
    'es', 'karate', 'it', 'karate', 'pt', 'karate'
  )
WHERE slug = 'karate';

UPDATE activities SET name = 'Judo',
  slugs = jsonb_build_object(
    'en', 'judo', 'fr', 'judo', 'de', 'judo',
    'es', 'judo', 'it', 'judo', 'pt', 'judo'
  )
WHERE slug = 'judo';

UPDATE activities SET name = 'Viet Vo Dao',
  slugs = jsonb_build_object(
    'en', 'viet-vo-dao', 'fr', 'viet-vo-dao', 'de', 'viet-vo-dao',
    'es', 'viet-vo-dao', 'it', 'viet-vo-dao', 'pt', 'viet-vo-dao'
  )
WHERE slug = 'viet-vo-dao';

UPDATE activities SET name = 'Taekwondo',
  slugs = jsonb_build_object(
    'en', 'taekwondo', 'fr', 'taekwondo', 'de', 'taekwon-do',
    'es', 'taekwondo', 'it', 'taekwondo', 'pt', 'taekwondo'
  )
WHERE slug IN ('taekwondo', 'taekwon-do');

UPDATE activities SET name = 'Krav Maga',
  slugs = jsonb_build_object(
    'en', 'krav-maga', 'fr', 'krav-maga', 'de', 'krav-maga',
    'es', 'krav-maga', 'it', 'krav-maga', 'pt', 'krav-maga'
  )
WHERE slug = 'krav-maga';

UPDATE activities SET name = 'Jujitsu',
  slugs = jsonb_build_object(
    'en', 'jujitsu', 'fr', 'jujitsu', 'de', 'ju-jutsu',
    'es', 'jiu-jitsu', 'it', 'jiu-jitsu', 'pt', 'jujitsu'
  )
WHERE slug IN ('jujitsu', 'ju-jutsu');

UPDATE activities SET name = 'Nihon Tai Jitsu',
  slugs = jsonb_build_object(
    'en', 'nihon-tai-jitsu', 'fr', 'nihon-tai-jitsu', 'de', 'nihon-tai-jitsu',
    'es', 'nihon-tai-jitsu', 'it', 'nihon-tai-jitsu', 'pt', 'nihon-tai-jitsu'
  )
WHERE slug = 'nihon-tai-jitsu';

UPDATE activities SET name = 'Aikido',
  slugs = jsonb_build_object(
    'en', 'aikido', 'fr', 'aikido', 'de', 'aikido',
    'es', 'aikido', 'it', 'aikido', 'pt', 'aikido'
  )
WHERE slug = 'aikido';

UPDATE activities SET name = 'Hapkido',
  slugs = jsonb_build_object(
    'en', 'hapkido', 'fr', 'hapkido', 'de', 'hapkido',
    'es', 'hapkido', 'it', 'hapkido', 'pt', 'hapkido'
  )
WHERE slug = 'hapkido';

UPDATE activities SET name = 'Tai Butou',
  slugs = jsonb_build_object(
    'en', 'tai-butou', 'fr', 'tai-butou', 'de', 'tai-butou',
    'es', 'tai-butou', 'it', 'tai-butou', 'pt', 'tai-butou'
  )
WHERE slug = 'tai-butou';

UPDATE activities SET name = 'Vo Thuat',
  slugs = jsonb_build_object(
    'en', 'vo-thuat', 'fr', 'vo-thuat', 'de', 'vo-thuat',
    'es', 'vo-thuat', 'it', 'vo-thuat', 'pt', 'vo-thuat'
  )
WHERE slug = 'vo-thuat';

UPDATE activities SET name = 'Boxing',
  slugs = jsonb_build_object(
    'en', 'boxing', 'fr', 'boxe', 'de', 'boxen',
    'es', 'boxeo', 'it', 'pugilato', 'pt', 'boxe'
  )
WHERE slug = 'boxing';

UPDATE activities SET name = 'Grappling',
  slugs = jsonb_build_object(
    'en', 'grappling', 'fr', 'grappling', 'de', 'grappling',
    'es', 'grappling', 'it', 'grappling', 'pt', 'grappling'
  )
WHERE slug = 'grappling';

UPDATE activities SET name = 'Capoeira',
  slugs = jsonb_build_object(
    'en', 'capoeira', 'fr', 'capoeira', 'de', 'capoeira',
    'es', 'capoeira', 'it', 'capoeira', 'pt', 'capoeira'
  )
WHERE slug = 'capoeira';

UPDATE activities SET name = 'K1',
  slugs = jsonb_build_object(
    'en', 'k1', 'fr', 'k1', 'de', 'k1',
    'es', 'k1', 'it', 'k1', 'pt', 'k1'
  )
WHERE slug = 'k1';

UPDATE activities SET name = 'Kung Fu',
  slugs = jsonb_build_object(
    'en', 'kung-fu', 'fr', 'kung-fu', 'de', 'kung-fu',
    'es', 'kung-fu', 'it', 'kung-fu', 'pt', 'kung-fu'
  )
WHERE slug = 'kung-fu';

UPDATE activities SET name = 'Naginata',
  slugs = jsonb_build_object(
    'en', 'naginata', 'fr', 'naginata', 'de', 'naginata',
    'es', 'naginata', 'it', 'naginata', 'pt', 'naginata'
  )
WHERE slug = 'naginata';

UPDATE activities SET name = 'Lady Boxing',
  slugs = jsonb_build_object(
    'en', 'lady-boxing', 'fr', 'lady-boxing', 'de', 'lady-boxen',
    'es', 'boxeo-femenino', 'it', 'pugilato-femminile', 'pt', 'boxe-feminina'
  )
WHERE slug = 'lady-boxing';

UPDATE activities SET name = 'Goshin Jitsu',
  slugs = jsonb_build_object(
    'en', 'goshin-jitsu', 'fr', 'goshin-jitsu', 'de', 'goshin-jitsu',
    'es', 'goshin-jitsu', 'it', 'goshin-jitsu', 'pt', 'goshin-jitsu'
  )
WHERE slug = 'goshin-jitsu';
