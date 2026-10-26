-- Add missing JSONB columns for activity content enrichment
ALTER TABLE activities ADD COLUMN IF NOT EXISTS history JSONB;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS stats JSONB;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS faqs JSONB;
