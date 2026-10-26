ALTER TABLE "activities"
ALTER COLUMN "content" TYPE jsonb USING content::jsonb;