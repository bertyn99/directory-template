/**
 * Google Maps business page scraper.
 *
 * Given lat/lng coordinates, derives a Maps URL and extracts
 * business information: name, rating, review count, category, hours.
 *
 * Uses the shared Playwright singleton. Google Maps is heavily JS-driven
 * and may block automated access — this scraper is designed to fail
 * gracefully and return partial data.
 */

import { createContext } from "./browser";
import type { BrowserContext, Page } from "playwright";

export interface MapsBusinessData {
  placeUrl: string;
  name: string | null;
  rating: number | null;
  reviewCount: number | null;
  category: string | null;
  address: string | null;
  openingHours: Record<string, string> | null;
  phoneNumber: string | null;
  website: string | null;
}

/**
 * Build a Google Maps search URL from coordinates.
 */
export function buildMapsUrl(lat: string, lng: string, name?: string): string {
  if (name) {
    // Search by name near coordinates — more precise
    const query = encodeURIComponent(`${name} ${lat},${lng}`);
    return `https://www.google.com/maps/search/${query}`;
  }
  return `https://www.google.com/maps/place/${lat},${lng}`;
}

/**
 * Scrape Google Maps for business data near the given coordinates.
 *
 * This is a best-effort scraper. Google frequently changes their DOM
 * structure and may rate-limit or block automated access.
 * Returns partial data — never throws for missing fields.
 */
export async function scrapeGoogleMaps(
  lat: string,
  lng: string,
  businessName?: string,
): Promise<MapsBusinessData> {
  const placeUrl = buildMapsUrl(lat, lng, businessName);

  const result: MapsBusinessData = {
    placeUrl,
    name: null,
    rating: null,
    reviewCount: null,
    category: null,
    address: null,
    openingHours: null,
    phoneNumber: null,
    website: null,
  };

  let context: BrowserContext;
  let page: Page | null = null;

  try {
    context = await createContext();
    page = await context.newPage();

    // Google Maps needs a shorter timeout and different wait strategy
    try {
      await page.goto(placeUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      // Wait for the main content to render
      await page.waitForTimeout(3000);
    } catch {
      // Google Maps is slow/flaky — try to extract whatever loaded
      console.warn(`[google-maps] Navigation timeout for ${placeUrl}`);
    }

    const extracted = await page.evaluate(() => {
      // Generic text extractor kept for future selector work — current
      // extraction below inlines each selector instead.
      const _getText = (selector: string): string | null => {
        const el = document.querySelector(selector);
        return el?.textContent?.trim() || null;
      };

      // Google Maps selectors change frequently — try multiple patterns
      // Rating
      const ratingEl =
        document.querySelector('[data-value="Rating"]') ||
        document.querySelector('span[aria-label*="stars"]') ||
        document.querySelector(".fontBodyMedium > span[aria-label]");
      const ratingText = ratingEl?.textContent?.trim() || null;
      const rating = ratingText ? parseFloat(ratingText) : null;

      // Review count
      const reviewEl = Array.from(document.querySelectorAll("span, button, a")).find((el) =>
        /\(\d{1,3}(?:,\d{3})*\)/.test(el.textContent || ""),
      );
      const reviewText = reviewEl?.textContent?.match(/\((\d{1,3}(?:,\d{3})*)\)/)?.[1];
      const reviewCount = reviewText ? parseInt(reviewText.replace(/,/g, ""), 10) : null;

      // Category
      const categoryEl =
        document.querySelector('button[data-value="Category"]') ||
        document.querySelector("span.fontBodyMedium > button");
      const category = categoryEl?.textContent?.trim() || null;

      // Business name
      const nameEl = document.querySelector("h1") || document.querySelector('[data-value="Title"]');
      const name = nameEl?.textContent?.trim() || null;

      // Address — look for it in the info section
      const addressEl = Array.from(
        document.querySelectorAll('[data-value="Address"], .fontBodyMedium'),
      ).find(
        (el) => /\d+\s/.test(el.textContent || "") && (el.textContent?.includes(",") || false),
      );
      const address = addressEl?.textContent?.trim() || null;

      // Phone number
      const phoneEl = Array.from(
        document.querySelectorAll('[data-value="Phone"], .fontBodyMedium'),
      ).find((el) => /(\+?\d[\d\s.-]{8,}\d)/.test(el.textContent || ""));
      const phoneMatch = phoneEl?.textContent?.match(/(\+?\d[\d\s.-]{8,}\d)/);
      const phoneNumber = phoneMatch?.[1]?.trim() || null;

      // Hours — look for the hours table or aria-label
      const hoursEl =
        document.querySelector('[data-value="Hours"]') ||
        document.querySelector('table[aria-label*="Hours"]');
      const hoursText = hoursEl?.getAttribute("aria-label") || hoursEl?.textContent || null;

      let openingHours: Record<string, string> | null = null;
      if (hoursText) {
        // Parse common formats: "Monday: 9:00 AM – 10:00 PM"
        const dayMatches = hoursText.matchAll(
          /(\w+day):\s*(\d{1,2}(?::\d{2})?\s*[AP]M)\s*(?:[–-])\s*(\d{1,2}(?::\d{2})?\s*[AP]M)/gi,
        );
        const hours: Record<string, string> = {};
        for (const match of dayMatches) {
          hours[match[1]] = `${match[2]}-${match[3]}`;
        }
        if (Object.keys(hours).length > 0) {
          openingHours = hours;
        }
      }

      return { rating, reviewCount, category, name, address, phoneNumber, openingHours };
    });

    result.rating = extracted.rating;
    result.reviewCount = extracted.reviewCount;
    result.category = extracted.category;
    result.name = extracted.name;
    result.address = extracted.address;
    result.phoneNumber = extracted.phoneNumber;
    result.openingHours = extracted.openingHours;
  } catch (error) {
    console.warn(`[google-maps] Failed to scrape ${placeUrl}:`, (error as Error).message);
  } finally {
    if (page) await page.close().catch(() => {});
  }

  return result;
}

/**
 * Build a concise context string from Maps data for the AI prompt.
 */
export function buildMapsContext(data: MapsBusinessData): string {
  const parts: string[] = [];

  if (data.name) parts.push(`Business name: ${data.name}`);
  if (data.category) parts.push(`Category: ${data.category}`);
  if (data.rating) parts.push(`Rating: ${data.rating}/5 (${data.reviewCount || "?"} reviews)`);
  if (data.address) parts.push(`Address: ${data.address}`);
  if (data.phoneNumber) parts.push(`Phone: ${data.phoneNumber}`);
  if (data.openingHours) {
    const hoursStr = Object.entries(data.openingHours)
      .map(([day, time]) => `${day}: ${time}`)
      .join(", ");
    parts.push(`Hours: ${hoursStr}`);
  }

  return parts.join("\n") || "No business data could be extracted from Google Maps.";
}
