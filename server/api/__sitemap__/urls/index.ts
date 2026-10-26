import { getAllVenueSlugs, getCategoryCityCombinations } from "~~/server/db/queries/venues";
import { listActivities } from "~~/server/db/queries/categories";
import { getCityHubSlugs } from "~~/server/db/queries/cities";
import { queryCollection } from "@nuxt/content/server";
import {
  ACTIVITY_CATALOG,
  LOCALE_HREFLANG,
  buildCategoryPath,
  buildCategorySitemapAlternatives,
  findActivityDefinition,
  getActivityLocaleSlug,
} from "~~/shared/activities";
import {
  majorEuCityFromPublicSlug,
  majorEuCityImageSlug,
} from "~~/shared/major-eu-cities";

export default defineSitemapEventHandler(async (event) => {
  const [venueSlugs, categoryCityPairs, cityHubSlugs, dbActivities] = await Promise.all([
    getAllVenueSlugs(),
    getCategoryCityCombinations(),
    getCityHubSlugs(),
    // Canonical activities that actually exist in the DB — avoids emitting
    // sitemap URLs for catalog entries with no DB row (404 prevention).
    listActivities(undefined, "en"),
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
      const frSlug = getActivityLocaleSlug(canonicalSlug, "fr") ?? canonicalSlug;
      return asSitemapUrl({
        loc: `categories/${frSlug}`,
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

    const frSlug = getActivityLocaleSlug(def.slug, "fr") ?? def.slug;
    return [
      asSitemapUrl({
        loc: `categories/${frSlug}/${citySlug}`,
        alternatives: buildCategorySitemapAlternatives(def.slug, citySlug),
      }),
    ];
  });

  const cityHubSitemap = cityHubSlugs.map((p) =>
    asSitemapUrl({
      loc: `country/${p.countrySlug}/${p.cityNameSlug}`,
      _i18nTransform: true,
    }),
  );

  // Category-guide silos — editorial prose (docs/seo/content-architecture.md §3b).
  // Queried server-side from the categoryGuides collections; `hub` entries are
  // skipped (hub URLs already come from the DB queries above). hreflang
  // alternatives only for locales that actually have the (category, type) content.
  const guideCollections = {
    fr: "categoryGuides_fr",
    en: "categoryGuides_en",
    de: "categoryGuides_de",
    es: "categoryGuides_es",
    it: "categoryGuides_it",
    pt: "categoryGuides_pt",
  } as const;
  const guideGroups = new Map<string, Array<{ locale: string; loc: string }>>();
  for (const locale of Object.keys(guideCollections) as Array<keyof typeof guideCollections>) {
    const rows = await queryCollection(event, guideCollections[locale])
      .select("style", "type")
      .all();
    for (const row of rows) {
      if (row.type === "hub") continue;
      const key = `${row.style}:${row.type}`;
      const group = guideGroups.get(key) ?? [];
      let loc: string | null = row.style === "_directory"
        ? (locale === "fr" ? "/venues/guide" : `/${locale}/venues/guide`)
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
          hreflang: LOCALE_HREFLANG[alt.locale as keyof typeof LOCALE_HREFLANG],
          href: `https://example-directory.com${alt.loc}`,
        })),
      }),
    ),
  );

  return [
    ...venuesSitemap,
    ...categoriesSitemap,
    ...categoryCitySitemap,
    ...cityHubSitemap,
    ...categoryGuideSitemap,
  ];
});
