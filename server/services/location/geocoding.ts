import { ofetch } from "ofetch";

export interface GeocodeInput {
  street: string;
  city: string;
  zip?: string;
  countryCode?: string;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  /** Which provider in the chain resolved the query. */
  provider: ProviderName;
}

type ProviderName = "locationiq" | "geonames" | "nominatim";

interface GeocodingConfig {
  locationiqApiKey?: string;
  locationiqRegion?: string;
  geonamesUsername?: string;
}

/**
 * Per-provider rate limiting (free-tier friendly):
 * - LocationIQ free tier allows ~2 req/s
 * - GeoNames free tier allows 1 req/s
 * - Nominatim public instance requires max 1 req/s (OSM usage policy)
 */
const lastRequestAt = new Map<ProviderName, number>();
const MIN_REQUEST_INTERVAL: Record<ProviderName, number> = {
  locationiq: 600,
  geonames: 1100,
  nominatim: 1100,
};

async function throttle(provider: ProviderName): Promise<void> {
  const now = Date.now();
  const last = lastRequestAt.get(provider) ?? 0;
  const wait = MIN_REQUEST_INTERVAL[provider] - (now - last);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt.set(provider, Date.now());
}

function parseFirstLatLng(
  response: unknown,
): { lat: number; lng: number } | null {
  const first = Array.isArray(response) ? response[0] : null;
  const lat = Number.parseFloat(String(first?.lat ?? ""));
  const lng = Number.parseFloat(String(first?.lon ?? ""));
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

function buildQuery(input: GeocodeInput): string {
  return [input.street, input.zip, input.city, input.countryCode]
    .filter(Boolean)
    .join(", ");
}

async function geocodeWithLocationIQ(
  query: string,
  config: GeocodingConfig,
): Promise<GeocodeResult | null> {
  if (!config.locationiqApiKey) return null;

  const region = config.locationiqRegion || "eu1";
  await throttle("locationiq");
  const response = await ofetch<Array<{ lat: string; lon: string }>>(
    `https://${region}.locationiq.com/v1/search.php`,
    {
      params: {
        key: config.locationiqApiKey,
        q: query,
        format: "json",
        limit: 1,
      },
      timeout: 8000,
      retry: 1,
      retryDelay: 800,
    },
  );

  const coords = parseFirstLatLng(response);
  if (!coords) return null;
  return { ...coords, provider: "locationiq" };
}

async function geocodeWithGeoNames(
  query: string,
  config: GeocodingConfig,
): Promise<GeocodeResult | null> {
  if (!config.geonamesUsername) return null;

  await throttle("geonames");
  const response = await ofetch<{ geonames?: Array<{ lat: number | string; lng: number | string }> }>(
    "https://secure.geonames.org/searchJSON",
    {
      params: {
        q: query,
        maxRows: 1,
        username: config.geonamesUsername,
      },
      timeout: 8000,
      retry: 1,
      retryDelay: 800,
    },
  );

  const first = response.geonames?.[0];
  const lat = Number.parseFloat(String(first?.lat ?? ""));
  const lng = Number.parseFloat(String(first?.lng ?? ""));
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng, provider: "geonames" };
}

async function geocodeWithNominatim(
  query: string,
): Promise<GeocodeResult | null> {
  await throttle("nominatim");
  const response = await ofetch<Array<{ lat: string; lon: string }>>(
    "https://nominatim.openstreetmap.org/search",
    {
      params: {
        q: query,
        format: "json",
        limit: 1,
        addressdetails: 1,
      },
      headers: {
        "User-Agent": "FightVenueFinder/1.0", // Required by Nominatim
      },
      timeout: 8000,
      retry: 1,
      retryDelay: 800,
    },
  );

  const coords = parseFirstLatLng(response);
  if (!coords) return null;
  return { ...coords, provider: "nominatim" };
}

function resolveConfig(): GeocodingConfig {
  try {
    const config = useRuntimeConfig();
    return {
      locationiqApiKey: config.locationiqApiKey as string | undefined,
      locationiqRegion: config.locationiqRegion as string | undefined,
      geonamesUsername: config.geonamesUsername as string | undefined,
    };
  } catch {
    // Outside a Nitro context (scripts/benchmarks): Nominatim only.
    return {};
  }
}

/**
 * Geocode an address through a provider chain (inspired by the PHP
 * Geocoder Chain pattern): LocationIQ (OSM data, higher rate limits) first,
 * GeoNames as secondary, the free Nominatim public instance as last resort.
 * Returns null only when every configured provider fails.
 */
export async function geocodeAddress(
  input: GeocodeInput
): Promise<GeocodeResult | null> {
  const query = buildQuery(input);
  if (!query) return null;

  const config = resolveConfig();
  const providers: Array<{
    name: ProviderName;
    run: () => Promise<GeocodeResult | null>;
  }> = [
    { name: "locationiq", run: () => geocodeWithLocationIQ(query, config) },
    { name: "geonames", run: () => geocodeWithGeoNames(query, config) },
    { name: "nominatim", run: () => geocodeWithNominatim(query) },
  ];

  for (const provider of providers) {
    try {
      const result = await provider.run();
      if (result) return result;
    } catch (error) {
      // Provider failure (network, quota, parse) — fall through to the next.
      console.error(`Geocoding error (${provider.name}):`, error);
    }
  }

  return null;
}
