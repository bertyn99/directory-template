import { syncCityCoverPaths } from "~~/server/services/location/covers";

/**
 * generate-city-covers
 *
 * Syncs top-30 city populations and matches committed cover images
 * (`public/img/cities/*.jpg`) to cities in the DB. No image generation.
 *
 * Idempotent: run after each deploy to pick up newly committed covers.
 *
 * POST /api/admin/tasks/generate-city-covers  { "force": false }
 */
export default defineTask({
  meta: {
    name: "generate-city-covers",
    description:
      "Sync top-30 city populations and match committed cover images to cities in the DB",
  },
  async run({ payload }) {
    const options = (payload ?? {}) as { force?: boolean };
    const result = await syncCityCoverPaths({
      force: options.force === true,
    });

    const message = `Done. Populations synced: ${result.populationsSynced}, matched: ${result.matched.length}, already set: ${result.alreadySet}, missing files: ${result.missing.length}, unmatched names: ${result.unmatched.length}`;
    console.log(`[generate-city-covers] ${message}`);

    if (result.missing.length > 0) {
      console.warn(
        "[generate-city-covers] Missing cover files:",
        result.missing.join(", "),
      );
    }

    return { result: "success", ...result };
  },
});
