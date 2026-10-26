-- Drop the existing primary key constraints
ALTER TABLE "venue_activities"
DROP CONSTRAINT IF EXISTS "venue_activities_pkey";

ALTER TABLE "venue_equipments"
DROP CONSTRAINT IF EXISTS "venue_equipments_pkey";

ALTER TABLE "venue_activities"
ADD CONSTRAINT "pk_venue_activities" PRIMARY KEY ("venue_id", "activity_id");
--> statement-breakpoint
ALTER TABLE "venue_equipments"
ADD CONSTRAINT "pk_venue_equipments" PRIMARY KEY ("venue_id", "equipment_id");
--> statement-breakpoint
ALTER TABLE "venue_activities" DROP COLUMN IF EXISTS "id";
--> statement-breakpoint
ALTER TABLE "venue_equipments" DROP COLUMN IF EXISTS "id";