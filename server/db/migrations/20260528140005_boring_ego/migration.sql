-- Add contraindications and benefits JSONB columns to activities
-- These store structured { title, description } arrays per locale
-- Used by style detail pages for dedicated card grid sections
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "contraindications" jsonb;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "benefits" jsonb;