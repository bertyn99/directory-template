-- NOTE: venue_translations table is being dropped in migration 0030.
-- Translations now live in venues.description JSONB directly.
-- This migration is a no-op to preserve journal sequence integrity.
SELECT 1;
