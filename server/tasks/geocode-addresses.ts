import { backfillAddressGeocodes } from "~~/server/services/location/geocode-backfill";

/**
 * geocode-addresses
 *
 * Backfills lat/lng for venue addresses via the geocoding provider chain
 * (LocationIQ → GeoNames → Nominatim), with city-centroid fallback.
 * Idempotent: only addresses with missing coordinates are processed,
 * so it is safe to run on a schedule as a catch-up for newly imported venues.
 *
 * POST /api/admin/tasks/geocode-addresses  { "force": false, "limit": 500 }
 */
export default defineTask({
  meta: {
    name: "geocode-addresses",
    description:
      "Backfill lat/lng for venue addresses (provider chain + city-centroid fallback)",
  },
  async run({ payload }) {
    const options = (payload ?? {}) as { force?: boolean; limit?: number };
    const result = await backfillAddressGeocodes({
      force: options.force === true,
      limit: typeof options.limit === "number" && options.limit > 0 ? options.limit : undefined,
    });

    const message = `Done. Processed: ${result.processed}, geocoded: ${result.geocoded}, centroid fallback: ${result.centroidFallback}, failed: ${result.failed}, providers: ${JSON.stringify(result.byProvider)}`;
    console.log(`[geocode-addresses] ${message}`);

    return { result: "success", ...result };
  },
});
