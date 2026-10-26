import type { BrowserContext } from "playwright";
import { navigateWithRetry, extractNextJsData } from "../../browser";
import type { PlaceData } from "../types";
import type { ActivityData, CityData } from "../../parser";

/**
 * MAS (Ma Salle de Sport) specific place data
 */
export interface MASPlaceData extends PlaceData {
  openingHours?: unknown;
  access?: unknown[];
  formules?: unknown[];
  equipments?: unknown[];
  activitiesByThematique?: unknown[];
}

interface JSONData {
  props: {
    pageProps: {
      activities?: ActivityData[];
      activityByCity?: CityData[];
      places?: MASPlaceData[];
      pagination?: {
        page: number;
        maxPage: number;
        total: number;
      };
    };
  };
}

/**
 * Get activities from the main activities page
 */
export async function getActivitiesFromUrl(
  url: string,
  context: BrowserContext
): Promise<ActivityData[]> {
  const page = await context.newPage();
  try {
    await navigateWithRetry(page, url);
    const jsonData = (await extractNextJsData(page)) as JSONData;
    return jsonData.props.pageProps?.activities || [];
  } finally {
    await page.close();
  }
}

/**
 * Get cities for a specific activity
 */
export async function getCitiesForActivity(
  url: string,
  context: BrowserContext
): Promise<CityData[]> {
  const page = await context.newPage();
  try {
    await navigateWithRetry(page, url);
    const jsonData = (await extractNextJsData(page)) as JSONData;
    return jsonData.props.pageProps?.activityByCity || [];
  } finally {
    await page.close();
  }
}

/**
 * Get places (venues) for a city with pagination support
 */
export async function getPlacesForCity(
  url: string,
  context: BrowserContext,
  maxPages: number = 10
): Promise<PlaceData[]> {
  const page = await context.newPage();
  const allPlaces: MASPlaceData[] = [];
  let currentPage = 1;
  let currentUrl = url;

  try {
    while (currentPage <= maxPages) {
      await navigateWithRetry(page, currentUrl);
      const jsonData = (await extractNextJsData(page)) as JSONData;

      const places = jsonData.props.pageProps?.places || [];
      allPlaces.push(...places);

      const pagination = jsonData.props.pageProps?.pagination;
      if (
        !pagination ||
        pagination.page >= pagination.maxPage ||
        places.length === 0
      ) {
        break;
      }

      currentPage++;
      const nextUrl = new URL(currentUrl);
      nextUrl.searchParams.set("page", currentPage.toString());
      currentUrl = nextUrl.href;
    }

    // Remove duplicates based on name
    const uniquePlaces = Array.from(
      new Map(allPlaces.map((place) => [place.name, place])).values()
    );

    return uniquePlaces;
  } finally {
    await page.close();
  }
}
