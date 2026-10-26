-- Migration 0033: Backfill per-locale slugs for all activities
-- Uses the slugify() PostgreSQL function for URL-safe slugs

-- Viet Vo Dao
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'viet-vo-dao', 'en', 'viet-vo-dao', 'de', 'viet-vo-dao',
  'es', 'viet-vo-dao', 'it', 'viet-vo-dao', 'pt', 'viet-vo-dao'
) WHERE id = 1;

-- Taekwondo
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'taekwondo', 'en', 'taekwondo', 'de', 'taekwondo',
  'es', 'taekwondo', 'it', 'taekwondo', 'pt', 'taekwondo'
) WHERE id = 2;

-- Nihon Taï Jitsu
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'nihon-tai-jitsu', 'en', 'nihon-tai-jitsu', 'de', 'nihon-tai-jitsu',
  'es', 'nihon-tai-jitsu', 'it', 'nihon-tai-jitsu', 'pt', 'nihon-tai-jitsu'
) WHERE id = 3;

-- Krav Maga
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'krav-maga', 'en', 'krav-maga', 'de', 'krav-maga',
  'es', 'krav-maga', 'it', 'krav-maga', 'pt', 'krav-maga'
) WHERE id = 4;

-- Karaté
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'karate', 'en', 'karate', 'de', 'karate',
  'es', 'karate', 'it', 'karate', 'pt', 'karate'
) WHERE id = 5;

-- Jujitsu
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'jujitsu', 'en', 'jujitsu', 'de', 'jujitsu',
  'es', 'jujitsu', 'it', 'jujitsu', 'pt', 'jujitsu'
) WHERE id = 6;

-- Judo
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'judo', 'en', 'judo', 'de', 'judo',
  'es', 'judo', 'it', 'judo', 'pt', 'judo'
) WHERE id = 7;

-- Boxe Française (Savate)
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'boxe-francaise', 'en', 'french-boxing', 'de', 'franzosisches-boxen',
  'es', 'boxeo-frances', 'it', 'pugilato-francese', 'pt', 'boxe-francesa'
) WHERE id = 8;

-- Boxe Anglaise (English Boxing)
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'boxe-anglaise', 'en', 'english-boxing', 'de', 'englisches-boxen',
  'es', 'boxeo-ingles', 'it', 'pugilato-inglese', 'pt', 'boxe-inglesa'
) WHERE id = 9;

-- Boxe Américaine
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'boxe-americaine', 'en', 'american-boxing', 'de', 'amerikanisches-boxen',
  'es', 'boxeo-americano', 'it', 'pugilato-americano', 'pt', 'boxe-americana'
) WHERE id = 10;

-- Jujitsu Brésilien (BJJ)
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'jujitsu-bresilien', 'en', 'brazilian-jiu-jitsu', 'de', 'brasilianisches-jujitsu',
  'es', 'jiu-jitsu-brasileno', 'it', 'jiu-jitsu-brasiliano', 'pt', 'jiu-jitsu-brasileiro'
) WHERE id = 11;

-- Aikido
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'aikido', 'en', 'aikido', 'de', 'aikido',
  'es', 'aikido', 'it', 'aikido', 'pt', 'aikido'
) WHERE id = 12;

-- Boxe Chic
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'boxe-chic', 'en', 'chic-boxing', 'de', 'chic-boxen',
  'es', 'boxeo-chic', 'it', 'pugilato-chic', 'pt', 'boxe-chic'
) WHERE id = 13;

-- Hapkido
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'hapkido', 'en', 'hapkido', 'de', 'hapkido',
  'es', 'hapkido', 'it', 'hapkido', 'pt', 'hapkido'
) WHERE id = 14;

-- Taï Butou
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'tai-butou', 'en', 'tai-butou', 'de', 'tai-butou',
  'es', 'tai-butou', 'it', 'tai-butou', 'pt', 'tai-butou'
) WHERE id = 15;

-- Vo Thuat
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'vo-thuat', 'en', 'vo-thuat', 'de', 'vo-thuat',
  'es', 'vo-thuat', 'it', 'vo-thuat', 'pt', 'vo-thuat'
) WHERE id = 16;

-- Kickboxing
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'kickboxing', 'en', 'kickboxing', 'de', 'kickboxing',
  'es', 'kickboxing', 'it', 'kickboxing', 'pt', 'kickboxing'
) WHERE id = 17;

-- MMA
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'mma', 'en', 'mma', 'de', 'mma',
  'es', 'mma', 'it', 'mma', 'pt', 'mma'
) WHERE id = 18;

-- Muay Thai
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'muay-thai', 'en', 'muay-thai', 'de', 'muay-thai',
  'es', 'muay-thai', 'it', 'muay-thai', 'pt', 'muay-thai'
) WHERE id = 19;

-- Boxing
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'boxe', 'en', 'boxing', 'de', 'boxen',
  'es', 'boxeo', 'it', 'pugilato', 'pt', 'boxe'
) WHERE id = 20;

-- Grappling
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'grappling', 'en', 'grappling', 'de', 'grappling',
  'es', 'grappling', 'it', 'grappling', 'pt', 'grappling'
) WHERE id = 21;

-- Wrestling
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'lutte', 'en', 'wrestling', 'de', 'ringen',
  'es', 'lucha', 'it', 'lotta', 'pt', 'luta'
) WHERE id = 22;

-- Capoeira
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'capoeira', 'en', 'capoeira', 'de', 'capoeira',
  'es', 'capoeira', 'it', 'capoeira', 'pt', 'capoeira'
) WHERE id = 23;

-- K1
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'k1', 'en', 'k1', 'de', 'k1',
  'es', 'k1', 'it', 'k1', 'pt', 'k1'
) WHERE id = 24;

-- Kung Fu
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'kung-fu', 'en', 'kung-fu', 'de', 'kung-fu',
  'es', 'kung-fu', 'it', 'kung-fu', 'pt', 'kung-fu'
) WHERE id = 25;

-- Naginata
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'naginata', 'en', 'naginata', 'de', 'naginata',
  'es', 'naginata', 'it', 'naginata', 'pt', 'naginata'
) WHERE id = 26;

-- Boxe Thaï
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'boxe-thai', 'en', 'thai-boxing', 'de', 'thai-boxen',
  'es', 'boxeo-tailandes', 'it', 'pugilato-thailandese', 'pt', 'boxe-tailandesa'
) WHERE id = 27;

-- Lady Boxing
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'lady-boxing', 'en', 'lady-boxing', 'de', 'lady-boxen',
  'es', 'boxeo-femenino', 'it', 'pugilato-femminile', 'pt', 'boxe-feminina'
) WHERE id = 28;

-- Kickboxen (German variant)
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'kickboxing', 'en', 'kickboxing', 'de', 'kickboxen',
  'es', 'kickboxing', 'it', 'kickboxing', 'pt', 'kickboxing'
) WHERE id = 29;

-- Thai-Boxen (German variant)
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'muay-thai', 'en', 'muay-thai', 'de', 'thai-boxen',
  'es', 'muay-thai', 'it', 'muay-thai', 'pt', 'muay-thai'
) WHERE id = 30;

-- Ringen (German for Wrestling)
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'lutte', 'en', 'wrestling', 'de', 'ringen',
  'es', 'lucha', 'it', 'lotta', 'pt', 'luta'
) WHERE id = 31;

-- Kampfsport (German for Martial Arts)
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'arts-martiaux', 'en', 'martial-arts', 'de', 'kampfsport',
  'es', 'artes-marciales', 'it', 'arti-marziali', 'pt', 'artes-marciais'
) WHERE id = 32;

-- Wing Chun
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'wing-chun', 'en', 'wing-chun', 'de', 'wing-chun',
  'es', 'wing-chun', 'it', 'wing-chun', 'pt', 'wing-chun'
) WHERE id = 33;

-- Wing Tsun
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'wing-tsun', 'en', 'wing-tsun', 'de', 'wing-tsun',
  'es', 'wing-tsun', 'it', 'wing-tsun', 'pt', 'wing-tsun'
) WHERE id = 34;

-- Goshin Jitsu
UPDATE activities SET slugs = jsonb_build_object(
  'fr', 'goshin-jitsu', 'en', 'goshin-jitsu', 'de', 'goshin-jitsu',
  'es', 'goshin-jitsu', 'it', 'goshin-jitsu', 'pt', 'goshin-jitsu'
) WHERE id = 35;
