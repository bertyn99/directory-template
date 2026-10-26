CREATE TABLE IF NOT EXISTS "translation_memory" (
  "id" serial PRIMARY KEY NOT NULL,
  "source_hash" text NOT NULL,
  "source_locale" text NOT NULL,
  "target_locale" text NOT NULL,
  "source_text" text,
  "translated_text" text NOT NULL,
  "provider" text,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "translation_memory_unique_lookup" ON "translation_memory" ("source_hash","source_locale","target_locale");
