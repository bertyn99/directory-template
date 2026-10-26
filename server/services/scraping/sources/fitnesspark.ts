import type {
  ScrapingSourceAdapter,
  ScrapingSourceMeta,
  ScrapingContext,
  GetPlacesOptions,
} from "./types";
import type { ActivityData, CityData, PlaceData } from "../parser";
import { getStaticActivities } from "../activities";
import { load } from "cheerio";

const BASE_URL = "https://www.fitnesspark.fr";
/** Generic multi-activity listing page (reference adapter — replace per source). */
const ACTIVITIES_URL = `${BASE_URL}/activites`;

/**
 * Sample activities attached to scraped venues.
 * PLACEHOLDER SAMPLES — each instantiation maps the source's real activities.
 */
const VENUE_ACTIVITIES = ["Fitness", "Yoga", "Spa"];

const meta: ScrapingSourceMeta = {
  id: "fitnesspark",
  name: "Fitness Park",
  baseUrl: BASE_URL,
  countries: ["FR"],
  locales: ["fr-FR"],
  requiresBrowser: false,
  maxConcurrency: 5,
};

/** Progressive rate limiting delay based on request index */
function getDelay(index: number): number {
  if (index < 10) return 500;
  if (index < 30) return 1000;
  return 2000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface VenueLink {
  name: string;
  slug: string;
  url: string;
}

interface JsonLdAddress {
  "@type"?: string;
  streetAddress?: string;
  addressLocality?: string;
  postalCode?: string;
  addressCountry?: string;
}

interface JsonLdGym {
  "@type": string;
  name?: string;
  url?: string;
  telephone?: string;
  address?: JsonLdAddress;
}

/**
 * Parse the activity listing page to extract venue slugs.
 * Venues appear as <a href="/venue/{slug}/"> links inside the swiper carousel.
 */
function parseVenueList(html: string): VenueLink[] {
  const $ = load(html);
  const venues: VenueLink[] = [];

  // Venue links are inside .venue__item articles with .overlink anchors
  $('article.node--type-venue a.overlink[href^="/venue/"]').each((_i, el) => {
    const href = $(el).attr("href") ?? "";
    const slugMatch = href.match(/^\/venue\/(.+?)\/?$/);
    if (!slugMatch) return;

    const slug = slugMatch[1]!;
    const name = $(el).find("span").text().trim() || slug;

    // Skip the generic /venue/ listing page
    if (!slug) return;

    venues.push({
      name,
      slug,
      url: `${BASE_URL}/venue/${slug}/`,
    });
  });

  return venues;
}

/**
 * Parse JSON-LD ExerciseGym data from a venue detail page.
 * Returns structured address, phone, and name.
 */
function parseVenueDetail(html: string): {
  name: string;
  telephone?: string;
  address?: { street?: string; city: string; zip?: string; country?: "FR" };
} | null {
  const $ = load(html);

  const ldScripts: string[] = [];
  $('script[type="application/ld+json"]').each((_i, el) => {
    ldScripts.push($(el).html() ?? "");
  });

  for (const raw of ldScripts) {
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }

    if (
      typeof data === "object" &&
      data !== null &&
      "@type" in data &&
      (data as Record<string, unknown>)["@type"] === "ExerciseGym"
    ) {
      const gym = data as JsonLdGym;
      const addr = gym.address;
      return {
        name: gym.name ?? "",
        telephone: gym.telephone,
        address: addr
          ? {
              street: addr.streetAddress,
              city: addr.addressLocality ?? "",
              zip: addr.postalCode,
              country: (addr.addressCountry as "FR") ?? "FR",
            }
          : undefined,
      };
    }
  }

  return null;
}

/**
 * Fitness Park activity-listing scraping source adapter.
 *
 * Strategy: $fetch (server-rendered Drupal HTML, no browser needed).
 * 1. Fetch the activity listing page → extract venue slugs
 * 2. For each slug, fetch /venue/{slug}/ detail page → parse JSON-LD for address/phone
 * 3. Map to PlaceData with sample activities
 */
export const fitnessparkSource: ScrapingSourceAdapter = {
  meta,
  async getActivities(_context: ScrapingContext): Promise<ActivityData[]> {
    return getStaticActivities("fitnesspark", (slug) => `${BASE_URL}/activites/${slug}/`);
  },

  async getCitiesForActivity(
    _context: ScrapingContext,
    _activity: ActivityData
  ): Promise<CityData[]> {
    // Fitness Park has venues across France — return a single "France" city entry.
    // The adapter's getPlacesForCity fetches all listing venues regardless of city.
    return [{ id: "france", city: "France", url: BASE_URL }];
  },

  async getPlacesForCity(
    _context: ScrapingContext,
    _city: CityData,
    _options?: GetPlacesOptions
  ): Promise<PlaceData[]> {
    const timeout = meta.requestTimeout ?? 30000;

    // Step 1: Fetch the activity listing page to get venue slugs
    const listingHtml = await $fetch<string>(ACTIVITIES_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout,
    });

    const venueLinks = parseVenueList(listingHtml);
    console.log(`[fitnesspark] Found ${venueLinks.length} venues`);

    // Step 2: Fetch each venue detail page
    const places: PlaceData[] = [];
    const errors: string[] = [];

    for (let i = 0; i < venueLinks.length; i++) {
      const venue = venueLinks[i]!;

      // Progressive rate limiting
      if (i > 0) {
        await sleep(getDelay(i));
      }

      try {
        const detailHtml = await $fetch<string>(venue.url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          timeout,
        });

        const detail = parseVenueDetail(detailHtml);

        if (detail) {
          places.push({
            name: detail.name || venue.name,
            url: venue.url,
            address: detail.address ?? { city: venue.name },
            tel: detail.telephone,
            website: venue.url,
            type: {
              activities: VENUE_ACTIVITIES,
              source: "fitnesspark",
              slug: venue.slug,
            },
            raw: {
              html: detailHtml,
              source: "fitnesspark",
              slug: venue.slug,
            },
          });
        } else {
          // JSON-LD not found — use basic info from listing
          places.push({
            name: venue.name,
            url: venue.url,
            address: { city: venue.name },
            website: venue.url,
            type: {
              activities: VENUE_ACTIVITIES,
              source: "fitnesspark",
              slug: venue.slug,
            },
            raw: {
              source: "fitnesspark",
              slug: venue.slug,
              error: "No JSON-LD ExerciseGym found on detail page",
            },
          });
        }

        if ((i + 1) % 10 === 0) {
          console.log(
            `[fitnesspark] Processed ${i + 1}/${venueLinks.length} venues`
          );
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unknown error fetching venue";
        errors.push(`${venue.slug}: ${msg}`);
        console.error(`[fitnesspark] Error fetching ${venue.slug}: ${msg}`);
      }
    }

    console.log(
      `[fitnesspark] Completed: ${places.length} places, ${errors.length} errors`
    );

    return places;
  },
};
