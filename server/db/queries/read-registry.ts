/**
 * Catalog of ALL read query functions for benchmarking and compliance tracking.
 * One entry per read function in server/db/queries/ — add here when creating new reads.
 */
import {
  getUserByEmail,
  getUserByEmailOrUsername,
  findAccountCredentials,
} from "./auth";
import { getUserById } from "./users";
import {
  getActiveSubscription,
  getSubscriptionByStripeId,
  getUserByStripeCustomerId,
} from "./subscription";
import {
  searchVenues,
  getVenueBySlug,
  getOwnedVenueBySlug,
  getCitiesWithVenueCountByActivitySlug,
  getMajorEuCitiesWithVenueCountByActivitySlug,
  getUserVenues,
  getAllVenueSlugs,
  getCityBySlug,
  getCategoryCityCombinations,
} from "./venues";
import {
  getCityHubData,
  getNearbyCitiesWithVenues,
  getCityHubSlugs,
  getTopCitiesPerCountry,
  searchCities,
  getActivitiesByCitySlug,
} from "./cities";
import {
  getAllActivitySlugs,
  listActivities,
  getActivityBySlug,
} from "./categories";
import {
  getVenueActivities,
  getVenueEquipments,
  getAllActivities,
  getAllEquipments,
} from "./venueRelations";
import {
  getFranchisesByOwnerId,
  getFranchiseByIdAndOwnerId,
} from "./franchises";
import {
  getFranchiseVenues,
  getFranchiseVenuesList,
  isFranchiseOwner,
} from "./franchiseVenues";
import {
  getVenueReviews,
  getVenueAverageRating,
  getVenueReviewCount,
  getFranchiseReviews,
  getFranchiseAverageRating,
  getReviewsOverTime,
  getOwnerVenueReviews,
} from "./reviews";
import { getOwnerVenueStats, getFranchiseStats } from "./analytics";
import { getVenueEvents, getFranchiseEvents } from "./events";
import { getVenueImages } from "./images";
import { getVenueFormulas } from "./formulas";
import { getCountriesWithCounts, getCitiesByCountrySlug } from "./countries";
import { getMatchCandidates, countMatchCandidates } from "./matchCandidates";
import { getBenchSamples, hasSample } from "./read-registry-samples";

export interface ReadQueryBenchCase {
  name: string;
  file: string;
  description: string;
  run: () => Promise<unknown>;
  skip?: () => Promise<boolean>;
}

function entry(
  name: string,
  file: string,
  description: string,
  run: () => Promise<unknown>,
  skip?: () => Promise<boolean>,
): ReadQueryBenchCase {
  return { name, file, description, run, skip };
}

export const readQueryRegistry: ReadQueryBenchCase[] = [
  // ── auth.ts ─────────────────────────────────────────────────────────
  entry("getUserByEmail", "auth.ts", "Lookup user by email", async () => {
    const s = await getBenchSamples();
    return getUserByEmail(s.userEmail!);
  }, async () => !hasSample(await getBenchSamples(), "userEmail")),

  entry("getUserByEmailOrUsername", "auth.ts", "Lookup by email or username", async () => {
    const s = await getBenchSamples();
    return getUserByEmailOrUsername(s.userEmail!, s.username!);
  }, async () => {
    const s = await getBenchSamples();
    return !s.userEmail || !s.username;
  }),

  entry("findAccountCredentials", "auth.ts", "Credentials account for user", async () => {
    const s = await getBenchSamples();
    return findAccountCredentials(s.userId!);
  }, async () => !hasSample(await getBenchSamples(), "userId")),

  // ── users.ts ────────────────────────────────────────────────────────
  entry("getUserById", "users.ts", "User row by UUID", async () => {
    const s = await getBenchSamples();
    return getUserById(s.userId!);
  }, async () => !hasSample(await getBenchSamples(), "userId")),

  // ── subscription.ts ─────────────────────────────────────────────────
  entry("getActiveSubscription", "subscription.ts", "Active subscription for user", async () => {
    const s = await getBenchSamples();
    return getActiveSubscription(s.userId!);
  }, async () => !hasSample(await getBenchSamples(), "userId")),

  entry("getSubscriptionByStripeId", "subscription.ts", "Subscription by Stripe ID", async () => {
    const s = await getBenchSamples();
    return getSubscriptionByStripeId(s.stripeSubscriptionId!);
  }, async () => !hasSample(await getBenchSamples(), "stripeSubscriptionId")),

  entry("getUserByStripeCustomerId", "subscription.ts", "User by Stripe customer ID", async () => {
    const s = await getBenchSamples();
    return getUserByStripeCustomerId(s.stripeCustomerId!);
  }, async () => !hasSample(await getBenchSamples(), "stripeCustomerId")),

  // ── venues.ts ────────────────────────────────────────────────────────
  entry("searchVenues.default", "venues.ts", "Paginated search, no filters", () =>
    searchVenues({ page: 1, pageSize: 20 })),

  entry("searchVenues.withSearch", "venues.ts", "Paginated search with text", () =>
    searchVenues({ search: "yoga", page: 1, pageSize: 20 })),

  entry("getVenueBySlug", "venues.ts", "Public venue detail", async () => {
    const s = await getBenchSamples();
    return getVenueBySlug(s.venueSlug!);
  }, async () => !hasSample(await getBenchSamples(), "venueSlug")),

  entry("getOwnedVenueBySlug", "venues.ts", "Owner edit — venue + ownership (3 reads)", async () => {
    const s = await getBenchSamples();
    return getOwnedVenueBySlug(s.venueSlug!, s.userId!);
  }, async () => {
    const s = await getBenchSamples();
    return !s.venueSlug || !s.userId;
  }),

  entry("getCitiesWithVenueCountByActivitySlug", "venues.ts", "Cities × activity venue counts", async () => {
    const s = await getBenchSamples();
    return getCitiesWithVenueCountByActivitySlug(s.activitySlug!);
  }, async () => !hasSample(await getBenchSamples(), "activitySlug")),

  entry("getMajorEuCitiesWithVenueCountByActivitySlug", "venues.ts", "Major EU cities per activity", async () => {
    const s = await getBenchSamples();
    return getMajorEuCitiesWithVenueCountByActivitySlug(s.activitySlug!);
  }, async () => !hasSample(await getBenchSamples(), "activitySlug")),

  entry("getUserVenues", "venues.ts", "Dashboard — venues for owner", async () => {
    const s = await getBenchSamples();
    return getUserVenues(s.userId!);
  }, async () => !hasSample(await getBenchSamples(), "userId")),

  entry("getAllVenueSlugs", "venues.ts", "Sitemap — all venue slugs", () => getAllVenueSlugs()),

  entry("getCityBySlug", "venues.ts", "City row by slug", async () => {
    const s = await getBenchSamples();
    return getCityBySlug(s.citySlug!);
  }, async () => !hasSample(await getBenchSamples(), "citySlug")),

  entry("getCategoryCityCombinations", "venues.ts", "Sitemap — category × city pairs", () =>
    getCategoryCityCombinations()),

  // ── cities.ts ───────────────────────────────────────────────────────
  entry("getCityHubData", "cities.ts", "City hub page (5+ reads)", async () => {
    const s = await getBenchSamples();
    return getCityHubData(s.cityHub!.countrySlug, s.cityHub!.cityNameSlug);
  }, async () => !hasSample(await getBenchSamples(), "cityHub")),

  entry("getNearbyCitiesWithVenues", "cities.ts", "Nearby cities for hub sidebar", async () => {
    const s = await getBenchSamples();
    return getNearbyCitiesWithVenues(s.cityHub!.countrySlug, s.cityHub!.cityNameSlug);
  }, async () => !hasSample(await getBenchSamples(), "cityHub")),

  entry("getCityHubSlugs", "cities.ts", "Sitemap — city hub slugs", () => getCityHubSlugs()),

  entry("getTopCitiesPerCountry", "cities.ts", "Top cities per country (window fn)", () =>
    getTopCitiesPerCountry(10)),

  entry("searchCities", "cities.ts", "City autocomplete", () =>
    searchCities({ search: "par", limit: 20 })),

  entry("getActivitiesByCitySlug", "cities.ts", "Activities with venues in city", async () => {
    const s = await getBenchSamples();
    return getActivitiesByCitySlug(s.citySlug!);
  }, async () => !hasSample(await getBenchSamples(), "citySlug")),

  // ── categories.ts ───────────────────────────────────────────────────────
  entry("getAllActivitySlugs", "categories.ts", "Sitemap — activity slugs", () => getAllActivitySlugs()),

  entry("listActivities", "categories.ts", "Category index — all activities", () => listActivities()),

  entry("listActivities.withSearch", "categories.ts", "Category index — name search", () =>
    listActivities("yoga")),

  entry("getActivityBySlug", "categories.ts", "Category detail by slug", async () => {
    const s = await getBenchSamples();
    return getActivityBySlug(s.activitySlug!);
  }, async () => !hasSample(await getBenchSamples(), "activitySlug")),

  // ── venueRelations.ts ────────────────────────────────────────────────
  entry("getVenueActivities", "venueRelations.ts", "Activities for one venue", async () => {
    const s = await getBenchSamples();
    return getVenueActivities(s.venueId!);
  }, async () => !hasSample(await getBenchSamples(), "venueId")),

  entry("getVenueEquipments", "venueRelations.ts", "Equipments for one venue", async () => {
    const s = await getBenchSamples();
    return getVenueEquipments(s.venueId!);
  }, async () => !hasSample(await getBenchSamples(), "venueId")),

  entry("getAllActivities", "venueRelations.ts", "Reference — all activities", () => getAllActivities()),

  entry("getAllEquipments", "venueRelations.ts", "Reference — all equipments", () => getAllEquipments()),

  // ── franchises.ts ─────────────────────────────────────────────────
  entry("getFranchisesByOwnerId", "franchises.ts", "Franchises for owner", async () => {
    const s = await getBenchSamples();
    return getFranchisesByOwnerId(s.userId!);
  }, async () => !hasSample(await getBenchSamples(), "userId")),

  entry("getFranchiseByIdAndOwnerId", "franchises.ts", "Single franchise ownership check", async () => {
    const s = await getBenchSamples();
    return getFranchiseByIdAndOwnerId(s.franchiseId!, s.userId!);
  }, async () => {
    const s = await getBenchSamples();
    return !s.franchiseId || !s.userId;
  }),

  // ── franchiseVenues.ts ─────────────────────────────────────────────
  entry("getFranchiseVenues", "franchiseVenues.ts", "All venue rows for franchise", async () => {
    const s = await getBenchSamples();
    return getFranchiseVenues(s.franchiseId!);
  }, async () => !hasSample(await getBenchSamples(), "franchiseId")),

  entry("getFranchiseVenuesList", "franchiseVenues.ts", "Franchise venues — dashboard columns", async () => {
    const s = await getBenchSamples();
    return getFranchiseVenuesList(s.franchiseId!);
  }, async () => !hasSample(await getBenchSamples(), "franchiseId")),

  entry("isFranchiseOwner", "franchiseVenues.ts", "Franchise ownership boolean", async () => {
    const s = await getBenchSamples();
    return isFranchiseOwner(s.franchiseId!, s.userId!);
  }, async () => {
    const s = await getBenchSamples();
    return !s.franchiseId || !s.userId;
  }),

  // ── reviews.ts ──────────────────────────────────────────────────────
  entry("getVenueReviews", "reviews.ts", "Paginated venue reviews", async () => {
    const s = await getBenchSamples();
    return getVenueReviews(s.venueId!, 1, 20);
  }, async () => !hasSample(await getBenchSamples(), "venueId")),

  entry("getVenueAverageRating", "reviews.ts", "Venue average rating", async () => {
    const s = await getBenchSamples();
    return getVenueAverageRating(s.venueId!);
  }, async () => !hasSample(await getBenchSamples(), "venueId")),

  entry("getVenueReviewCount", "reviews.ts", "Venue review count", async () => {
    const s = await getBenchSamples();
    return getVenueReviewCount(s.venueId!);
  }, async () => !hasSample(await getBenchSamples(), "venueId")),

  entry("getFranchiseReviews", "reviews.ts", "All reviews for franchise venues", async () => {
    const s = await getBenchSamples();
    return getFranchiseReviews(s.franchiseId!);
  }, async () => !hasSample(await getBenchSamples(), "franchiseId")),

  entry("getFranchiseAverageRating", "reviews.ts", "Franchise average rating", async () => {
    const s = await getBenchSamples();
    return getFranchiseAverageRating(s.franchiseId!);
  }, async () => !hasSample(await getBenchSamples(), "franchiseId")),

  entry("getReviewsOverTime", "reviews.ts", "Monthly review chart data", () => getReviewsOverTime(12)),

  entry("getOwnerVenueReviews", "reviews.ts", "Owner dashboard — all venue reviews", async () => {
    const s = await getBenchSamples();
    return getOwnerVenueReviews(s.userId!);
  }, async () => !hasSample(await getBenchSamples(), "userId")),

  // ── analytics.ts ────────────────────────────────────────────────────
  entry("getOwnerVenueStats", "analytics.ts", "Owner dashboard aggregates", async () => {
    const s = await getBenchSamples();
    return getOwnerVenueStats(s.userId!);
  }, async () => !hasSample(await getBenchSamples(), "userId")),

  entry("getFranchiseStats", "analytics.ts", "Franchise dashboard aggregates", async () => {
    const s = await getBenchSamples();
    return getFranchiseStats(s.franchiseId!);
  }, async () => !hasSample(await getBenchSamples(), "franchiseId")),

  // ── events.ts ───────────────────────────────────────────────────────
  entry("getVenueEvents", "events.ts", "Events for one venue", async () => {
    const s = await getBenchSamples();
    return getVenueEvents(s.venueId!);
  }, async () => !hasSample(await getBenchSamples(), "venueId")),

  entry("getFranchiseEvents", "events.ts", "Events for franchise venues", async () => {
    const s = await getBenchSamples();
    return getFranchiseEvents(s.franchiseId!);
  }, async () => !hasSample(await getBenchSamples(), "franchiseId")),

  // ── images.ts ───────────────────────────────────────────────────────
  entry("getVenueImages", "images.ts", "Images for one venue", async () => {
    const s = await getBenchSamples();
    return getVenueImages(s.venueId!);
  }, async () => !hasSample(await getBenchSamples(), "venueId")),

  // ── formulas.ts ─────────────────────────────────────────────────────
  entry("getVenueFormulas", "formulas.ts", "Pricing formulas for venue", async () => {
    const s = await getBenchSamples();
    return getVenueFormulas(s.venueId!);
  }, async () => !hasSample(await getBenchSamples(), "venueId")),

  // ── countries.ts ────────────────────────────────────────────────────
  entry("getCountriesWithCounts", "countries.ts", "Country list with venue/city counts", () =>
    getCountriesWithCounts()),

  entry("getCitiesByCountrySlug", "countries.ts", "Cities in country", async () => {
    const s = await getBenchSamples();
    return getCitiesByCountrySlug(s.countrySlug!);
  }, async () => !hasSample(await getBenchSamples(), "countrySlug")),

  entry("getCitiesByCountrySlug.withSearch", "countries.ts", "Cities in country + search", async () => {
    const s = await getBenchSamples();
    return getCitiesByCountrySlug(s.countrySlug!, { search: "par" });
  }, async () => !hasSample(await getBenchSamples(), "countrySlug")),

  // ── matchCandidates.ts ──────────────────────────────────────────────
  entry("getMatchCandidates", "matchCandidates.ts", "Admin — paginated candidates", () =>
    getMatchCandidates({ status: "PENDING", page: 1, pageSize: 20 })),

  entry("countMatchCandidates", "matchCandidates.ts", "Admin — pending count only", () =>
    countMatchCandidates("PENDING")),
];

export const readQueryNames = readQueryRegistry.map((e) => e.name);

/** Group registry entries by source file (for audit reports). */
export function groupRegistryByFile(): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const { name, file } of readQueryRegistry) {
    (grouped[file] ??= []).push(name);
  }
  return grouped;
}
