import { getAllVenueSlugs, getCategoryCityCombinations } from "~~/server/db/queries/venues";
import { getPublicFranchiseSlugs } from "~~/server/db/queries/franchises";
import { listActivities } from "~~/server/db/queries/categories";
import { getCityHubSlugs } from "~~/server/db/queries/cities";
import { queryCollection } from "@nuxt/content/server";
import { directoryConfig } from "~~/directory.config";
import {
  ACTIVITY_CATALOG,
  buildCategoryPath,
  buildCategorySitemapAlternatives,
  findActivityDefinition,
  getActivityLocaleSlug,
} from "~~/shared/activities";
import { hreflangOf } from "~~/shared/locale-meta";
import {
  CITY_URL_PATTERN,
  buildChainCategorySitemapAlternatives,
} from "~~/shared/city-chain";
import {
  majorEuCityFromPublicSlug,
  majorEuCityImageSlug,
} from "~~/shared/major-eu-cities";

export default defineSitemapEventHandler(async (event) => {
  const [venueSlugs, categoryCityPairs, cityHubSlugs, dbActivities, franchiseSlugs] = await Promise.all([
    getAllVenueSlugs(),
    getCategoryCityCombinations(),
    getCityHubSlugs(),
    // Canonical activities that actually exist in the DB — avoids emitting
    // sitemap URLs for catalog entries with no DB row (404 prevention).
    listActivities(undefined, "en"),
    // Public group pages: only franchises with ≥1 active venue (the query
    // groups by slug, so the emission can never 404).
    getPublicFranchiseSlugs(),
  ]);

  // Build the set of canonical English slugs that have a DB row, so the categories
  // sitemap only references pages that resolve (200). Previously this iterated
  // Object.keys(ACTIVITY_CATALOG), which included entries with no
  // no matching activities row → soft-404 in the sitemap.
  const publishedCanonicalSlugs = new Set(
    dbActivities.map((a) => a.slug),
  );

  const categoriesSitemap = Object.keys(ACTIVITY_CATALOG)
    .filter((canonicalSlug) => publishedCanonicalSlugs.has(canonicalSlug))
    .map((canonicalSlug) => {
      // The default locale serves WITHOUT a URL prefix — its slug is the
      // canonical (unprefixed) categories path.
      const defaultSlug =
        getActivityLocaleSlug(canonicalSlug, directoryConfig.defaultLocale)
        ?? canonicalSlug;
      return asSitemapUrl({
        loc: `categories/${defaultSlug}`,
        alternatives: buildCategorySitemapAlternatives(canonicalSlug),
      });
    });

  const venuesSitemap = venueSlugs.map((p) =>
    asSitemapUrl({
      loc: "venues/" + p.slug,
      lastmod: p.updatedAt,
      _i18nTransform: true,
    }),
  );

  // Public group hubs — one URL per franchise with ≥1 public venue, same
  // locale-prefixed alternates convention as /venues/** (_i18nTransform).
  const groupsSitemap = franchiseSlugs
    .filter((row): row is { slug: string } => Boolean(row.slug))
    .map((row) =>
      asSitemapUrl({
        loc: "groups/" + row.slug,
        _i18nTransform: true,
      }),
    );

  const seenCategoryCity = new Set<string>();
  const categoryCitySitemap = categoryCityPairs.flatMap((pair) => {
    const def = findActivityDefinition(pair.activity_slug);
    if (!def) return [];

    const canonicalCity = majorEuCityFromPublicSlug(pair.city_slug);
    const citySlug = canonicalCity
      ? majorEuCityImageSlug(canonicalCity)
      : pair.city_slug;

    const key = `${def.slug}:${citySlug}`;
    if (seenCategoryCity.has(key)) return [];
    seenCategoryCity.add(key);

    const defaultSlug =
      getActivityLocaleSlug(def.slug, directoryConfig.defaultLocale) ?? def.slug;

    // Country-first chain: /{country}/{city}/{category-default-slug} with
    // per-locale chain hreflang alternatives. Needs the country slug from the
    // combinations query (cities ⋈ countries).
    if (CITY_URL_PATTERN === "country-city-category" && pair.country_slug) {
      return [
        asSitemapUrl({
          loc: `${pair.country_slug}/${citySlug}/${defaultSlug}`,
          alternatives: buildChainCategorySitemapAlternatives(
            def.slug,
            pair.country_slug,
            citySlug,
          ),
        }),
      ];
    }

    // Legacy categories shape (category-city pattern).
    return [
      asSitemapUrl({
        loc: `categories/${defaultSlug}/${citySlug}`,
        alternatives: buildCategorySitemapAlternatives(def.slug, citySlug),
      }),
    ];
  });

  const cityHubSitemap = cityHubSlugs.map((p) =>
    asSitemapUrl({
      // Country-first chain: bare /{country}/{city}; legacy: /country/**.
      // _i18nTransform adds the locale prefixes (slugs identical per locale).
      loc:
        CITY_URL_PATTERN === "country-city-category"
          ? `${p.countrySlug}/${p.cityNameSlug}`
          : `country/${p.countrySlug}/${p.cityNameSlug}`,
      _i18nTransform: true,
    }),
  );

  // Category-guide silos — editorial prose (docs/seo/content-architecture.md §3b).
  // Queried server-side from the categoryGuides collections; only ACTIVE
  // locales have one (content.config.ts derives the exact same set from
  // directoryConfig.locales — querying a non-created collection would 500 the
  // sitemap). `hub` entries are skipped (hub URLs already come from the DB
  // queries above). hreflang alternatives only for locales that actually have
  // the (category, type) content.
  const guideGroups = new Map<string, Array<{ locale: string; loc: string }>>();
  for (const locale of directoryConfig.locales) {
    const rows = await queryCollection(event, `categoryGuides_${locale}`)
      .select("style", "type")
      .all();
    for (const row of rows) {
      if (row.type === "hub") continue;
      const key = `${row.style}:${row.type}`;
      const group = guideGroups.get(key) ?? [];
      let loc: string | null = row.style === "_directory"
        ? (locale === directoryConfig.defaultLocale
            ? "/venues/guide"
            : `/${locale}/venues/guide`)
        : null;
      if (!loc) {
        // Unknown category slug in content — skip instead of 500-ing the sitemap
        const def = findActivityDefinition(row.style);
        if (!def) continue;
        loc = `${buildCategoryPath(locale, def.slug)}/${row.type}`;
      }
      group.push({ locale, loc });
      guideGroups.set(key, group);
    }
  }
  const categoryGuideSitemap = [...guideGroups.values()].flatMap((group) =>
    group.map(({ loc }) =>
      asSitemapUrl({
        loc: loc.replace(/^\//, ""),
        alternatives: group.map((alt) => ({
          hreflang: hreflangOf(alt.locale) ?? alt.locale,
          href: `${directoryConfig.url}${alt.loc}`,
        })),
      }),
    ),
  );

  return [
    ...venuesSitemap,
    ...groupsSitemap,
    ...categoriesSitemap,
    ...categoryCitySitemap,
    ...cityHubSitemap,
    ...categoryGuideSitemap,
  ];
});
