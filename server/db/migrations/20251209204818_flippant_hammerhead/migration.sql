CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint

CREATE TYPE "public"."auth_provider" AS ENUM('credentials', 'google', 'facebook', 'apple', 'twitter', 'github');
--> statement-breakpoint
CREATE TABLE "accounts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
    "provider" "auth_provider" NOT NULL,
    "provider_account_id" text NOT NULL,
    "user_id" uuid NOT NULL,
    "access_token" text,
    "refresh_token" text,
    "expires_at" timestamp
    with
        time zone,
        "refresh_token_expires_at" timestamp
    with
        time zone,
        "token_type" text,
        "scope" text,
        "id_token" text,
        "hashed_password" text,
        "created_at" timestamp
    with
        time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp
    with
        time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
    "user_id" uuid NOT NULL,
    "token" text NOT NULL,
    "user_agent" text,
    "ip_address" text,
    "expires_at" timestamp
    with
        time zone NOT NULL,
        "created_at" timestamp
    with
        time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp
    with
        time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Migrate existing integer identifiers to UUID while preserving relationships
ALTER TABLE "users" ADD COLUMN "id_v2" uuid;
--> statement-breakpoint
UPDATE "users"
SET
    "id_v2" = gen_random_uuid ()
WHERE
    "id_v2" IS NULL;
--> statement-breakpoint
ALTER TABLE "users"
ALTER COLUMN "id_v2"
SET DEFAULT gen_random_uuid ();
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id_v2" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "franchises" ADD COLUMN "owner_id_v2" uuid;
--> statement-breakpoint
UPDATE "franchises" f
SET "owner_id_v2" = u."id_v2"
FROM "users" u
WHERE f."owner_id" = u."id";
--> statement-breakpoint

ALTER TABLE "user_venues" ADD COLUMN "user_id_v2" uuid;
--> statement-breakpoint
UPDATE "user_venues" uc
SET "user_id_v2" = u."id_v2"
FROM "users" u
WHERE uc."user_id" = u."id";
--> statement-breakpoint

ALTER TABLE "franchises"
DROP CONSTRAINT IF EXISTS "franchises_owner_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_venues"
DROP CONSTRAINT IF EXISTS "user_venues_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_pkey";
--> statement-breakpoint

ALTER TABLE "users" DROP COLUMN "id";
--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "id_v2" TO "id";
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
--> statement-breakpoint

ALTER TABLE "franchises" DROP COLUMN "owner_id";
--> statement-breakpoint
ALTER TABLE "franchises" RENAME COLUMN "owner_id_v2" TO "owner_id";
--> statement-breakpoint

ALTER TABLE "user_venues" DROP COLUMN "user_id";
--> statement-breakpoint
ALTER TABLE "user_venues" RENAME COLUMN "user_id_v2" TO "user_id";
--> statement-breakpoint

ALTER TABLE "franchises" ADD CONSTRAINT "franchises_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_venues" ADD CONSTRAINT "user_venues_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Align remaining user columns with new auth schema
ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE text;
--> statement-breakpoint
ALTER TABLE "users"
ALTER COLUMN "created_at"
SET
    DATA TYPE timestamp
with
    time zone;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "users"
ALTER COLUMN "updated_at"
SET
    DATA TYPE timestamp
with
    time zone;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "users"
ALTER COLUMN "stripe_customer_id"
SET
    DATA TYPE text;
--> statement-breakpoint
ALTER TABLE "users"
ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;
--> statement-breakpoint
ALTER TABLE "users"
ADD COLUMN "onboarding_step" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "password_hash";
--> statement-breakpoint
ALTER TABLE "users"
ADD CONSTRAINT "users_username_unique" UNIQUE ("username");
--> statement-breakpoint
ALTER TABLE "users"
ADD CONSTRAINT "users_stripe_customer_id_unique" UNIQUE ("stripe_customer_id");