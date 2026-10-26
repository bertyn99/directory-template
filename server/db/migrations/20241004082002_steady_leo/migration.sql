ALTER TABLE "activities" ADD COLUMN "competitions" jsonb;--> statement-breakpoint
ALTER TABLE "activities" DROP COLUMN IF EXISTS "resume";