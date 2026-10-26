-- Add GIN index for fast JSONB slug lookups
-- Used by: server/api/styles/[slug]/index.get.ts (slugs->>locale = value)
-- Used by: server/db/service/venue.ts (jsonb_each_text(slugs))
CREATE INDEX IF NOT EXISTS idx_activities_slugs_gin ON activities USING gin (slugs jsonb_path_ops);
