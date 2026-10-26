import {
  getActiveVenueAddressesForGeocode,
  setAddressGeocode,
} from "~~/server/db/queries/cities";
import { geocodeAddress } from "~~/server/services/location/geocoding";

export interface GeocodeBackfillResult {
  processed: number;
  geocoded: number;
  centroidFallback: number;
  failed: number;
  byProvider: Record<string, number>;
}

/**
 * Backfill lat/lng for addresses of active venues using the geocoding
 * provider chain. Falls back to the city centroid when street-level
 * geocoding fails, so every processed address ends up with usable
 * coordinates for maps and distance sorting.
 *
 * Idempotent: only addresses with missing coordinates are processed
 * (pass `force` to re-geocode everything). Run after each deploy or on
 * a schedule so newly imported venues get picked up.
 */
export async function backfillAddressGeocodes(
  options: { force?: boolean; limit?: number } = {},
): Promise<GeocodeBackfillResult> {
  const limit =
    typeof options.limit === "number" && options.limit > 0
      ? options.limit
      : 5000;

  const rows = await getActiveVenueAddressesForGeocode(
    limit,
    options.force === true,
  );

  const stats: GeocodeBackfillResult = {
    processed: 0,
    geocoded: 0,
    centroidFallback: 0,
    failed: 0,
    byProvider: {},
  };

  for (const row of rows) {
    stats.processed++;

    let coords: { lat: number; lng: number };
    const geocoded = await geocodeAddress({
      street: row.street1,
      city: row.city,
      zip: row.zip ?? undefined,
      countryCode: row.country ?? undefined,
    });

    if (geocoded) {
      coords = { lat: geocoded.lat, lng: geocoded.lng };
      stats.geocoded++;
      stats.byProvider[geocoded.provider] =
        (stats.byProvider[geocoded.provider] ?? 0) + 1;
    } else if (row.cityLat !== null && row.cityLng !== null) {
      // Street-level geocoding failed — fall back to the city centroid so
      // the address still lands on the map at the right city.
      coords = { lat: row.cityLat, lng: row.cityLng };
      stats.centroidFallback++;
    } else {
      stats.failed++;
      continue;
    }

    await setAddressGeocode(row.id, String(coords.lat), String(coords.lng));
  }

  return stats;
}
