import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: [
    "./server/db/schemas/auth.ts",
    "./server/db/schemas/core.ts",
    "./server/db/schemas/location.ts",
    "./server/db/schemas/venues.ts",
    "./server/db/schemas/activities.ts",
    "./server/db/schemas/venueSources.ts",
    "./server/db/schemas/subscription.ts",
    "./server/db/schemas/sources.ts",
    "./server/db/schemas/matchCandidates.ts",
  ],
  out: "./server/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
