import {
  getActivitiesFromUrl,
  getCitiesForActivity,
  getPlacesForCity,
  type MASPlaceData,
} from "./masalledesport/parser";
import type { ActivityData, CityData } from "../parser";
import type {
  ScrapingSourceAdapter,
  ScrapingSourceMeta,
  ScrapingContext,
  GetPlacesOptions,
} from "./types";

const BASE_URL = "https://www.masalledesport.com";
/** Generic multi-activity listing page (reference adapter — replace per source). */
const ACTIVITIES_URL = "https://www.masalledesport.com/activites,t4.php";

const meta: ScrapingSourceMeta = {
  id: "masalledesport",
  name: "Ma Salle de Sport",
  baseUrl: BASE_URL,
  countries: ["FR"],
  locales: ["fr-FR"],
  requiresBrowser: true,
  requestTimeout: 30000,
  maxConcurrency: 3,
};

/**
 * MAS (Ma Salle de Sport) scraping source adapter
 */
export const masalledesportSource: ScrapingSourceAdapter = {
  meta,
  async getActivities(context: ScrapingContext): Promise<ActivityData[]> {
    return await getActivitiesFromUrl(ACTIVITIES_URL, context.browserContext!);
  },
  async getCitiesForActivity(
    context: ScrapingContext,
    activity: ActivityData
  ): Promise<CityData[]> {
    const activityUrl = new URL(activity.url, BASE_URL).href;
    return await getCitiesForActivity(activityUrl, context.browserContext!);
  },
  async getPlacesForCity(
    context: ScrapingContext,
    city: CityData,
    options?: GetPlacesOptions
  ): Promise<MASPlaceData[]> {
    const cityUrl = new URL(`${city.url}?page=1`, BASE_URL).href;
    const maxPages = options?.maxPages ?? 10;
    return await getPlacesForCity(cityUrl, context.browserContext!, maxPages);
  },
};

