/**
 * Category catalog — shared between client and server.
 *
 * Identity rules (same idea as scraping import mapping):
 * - English `slug` is the canonical key (NOT database id — ids differ across envs)
 * - Locale variants live in `names` / `slugs` keyed by locale
 * - Source aliases map to a canonical English slug
 * - Never expose alias rows as separate filter options
 *
 * ⚠️ PLACEHOLDER SAMPLES — the catalog entries below (fitness / yoga / spa)
 * are generic samples so the template compiles and tests pass. Each
 * instantiation REPLACES them with its own category taxonomy.
 */

/** Seed IDs for DBs created from fixed-ID migrations. Do NOT use for prod identity. */
export const ACTIVITIES = {
  FITNESS: 1,
  YOGA: 2,
  SPA: 3,
} as const satisfies Record<string, number>;

export type ActivityId = (typeof ACTIVITIES)[keyof typeof ACTIVITIES];

export type ActivityLocale = "en" | "fr" | "de" | "es" | "it" | "pt";

export const ACTIVITY_LOCALES: ActivityLocale[] = [
  "fr",
  "en",
  "de",
  "es",
  "it",
  "pt",
];

export const LOCALE_HREFLANG: Record<ActivityLocale, string> = {
  fr: "fr-FR",
  en: "en-US",
  de: "de-DE",
  es: "es-ES",
  it: "it-IT",
  pt: "pt-PT",
};

export interface ActivityDefinition {
  /** English canonical slug — portable identity across environments */
  slug: string;
  /** English canonical name */
  name: string;
  /** Localized display names keyed by locale */
  names: Partial<Record<ActivityLocale, string>>;
  /** Localized URL slugs keyed by locale */
  slugs: Partial<Record<ActivityLocale, string>>;
  /**
   * Historical / env-specific primary slugs that still identify this activity
   * (e.g. prod used French slug as activities.slug).
   */
  legacySlugs?: string[];
}

function def(
  slug: string,
  name: string,
  names: Partial<Record<ActivityLocale, string>> = {},
  slugs: Partial<Record<ActivityLocale, string>> = {},
  legacySlugs: string[] = [],
): ActivityDefinition {
  return {
    slug,
    name,
    names: { en: name, ...names },
    slugs: { en: slug, ...slugs },
    legacySlugs,
  };
}

/**
 * Canonical categories keyed by English slug.
 * Match DB rows via findActivityDefinition() — never by numeric id.
 *
 * ⚠️ PLACEHOLDER SAMPLES (fitness / yoga / spa) — replace per instantiation.
 */
export const ACTIVITY_CATALOG: Record<string, ActivityDefinition> = {
  fitness: def(
    "fitness",
    "Fitness",
    { fr: "Fitness", de: "Fitness", es: "Fitness", it: "Fitness", pt: "Fitness" },
    { fr: "fitness", de: "fitness", es: "fitness", it: "fitness", pt: "fitness" },
  ),
  yoga: def(
    "yoga",
    "Yoga",
    { fr: "Yoga", de: "Yoga", es: "Yoga", it: "Yoga", pt: "Yoga" },
    { fr: "yoga", de: "yoga", es: "yoga", it: "yoga", pt: "yoga" },
  ),
  spa: def(
    "spa",
    "Spa",
    { fr: "Spa", de: "Spa", es: "Spa", it: "Spa", pt: "Spa" },
    { fr: "spa", de: "spa", es: "spa", it: "spa", pt: "spa" },
  ),
};

/** English display names keyed by English slug */
export const ACTIVITY_NAMES_BY_SLUG: Record<string, string> = Object.fromEntries(
  Object.values(ACTIVITY_CATALOG).map((a) => [a.slug, a.name]),
);

/**
 * @deprecated Seed-ID map — IDs differ between local and prod. Prefer slug helpers.
 * Kept for scraping constants that still reference numeric IDs on seed-shaped DBs.
 */
export const ACTIVITY_NAMES: Record<ActivityId, string> = {
  [ACTIVITIES.FITNESS]: "Fitness",
  [ACTIVITIES.YOGA]: "Yoga",
  [ACTIVITIES.SPA]: "Spa",
};

/**
 * Alias slug/name → canonical English slug.
 * SAMPLE aliases — each instantiation maps its real source aliases here.
 */
export const ACTIVITY_ALIASES: Record<string, string> = {
  // Fitness
  gym: "fitness",
  "salle-de-sport": "fitness",
  fitnessstudio: "fitness",
  // Yoga
  "hatha-yoga": "yoga",
  vinyasa: "yoga",
  // Spa
  wellness: "spa",
  "bien-etre": "spa",
};

/**
 * Slugs that are pure aliases / junk — exclude from filter lists.
 * Canonical rows may temporarily still use these as primary slug;
 * listActivities promotes them via catalog.
 */
export const ACTIVITY_ALIAS_ONLY_SLUGS = new Set([
  "gym",
  "wellness",
]);

/** Known junk rows (venue names wrongly inserted as activities) */
export const ACTIVITY_JUNK_SLUGS = new Set<string>();

/** @deprecated use ACTIVITY_ALIAS_ONLY_SLUGS */
export const ACTIVITY_ALIAS_SLUGS = ACTIVITY_ALIAS_ONLY_SLUGS;

function normalizeKey(value: string): string {
  return value.toLowerCase().trim();
}

/** Resolve any slug/name to the catalog definition */
export function findActivityDefinition(
  slugOrName: string,
): ActivityDefinition | undefined {
  const key = normalizeKey(slugOrName);
  if (!key) return undefined;

  const aliasTarget = ACTIVITY_ALIASES[key];
  if (aliasTarget && ACTIVITY_CATALOG[aliasTarget]) {
    return ACTIVITY_CATALOG[aliasTarget];
  }

  if (ACTIVITY_CATALOG[key]) return ACTIVITY_CATALOG[key];

  for (const activity of Object.values(ACTIVITY_CATALOG)) {
    if (normalizeKey(activity.name) === key) return activity;
    if (activity.legacySlugs?.some((s) => normalizeKey(s) === key)) return activity;
    for (const localeName of Object.values(activity.names)) {
      if (localeName && normalizeKey(localeName) === key) return activity;
    }
    for (const localeSlug of Object.values(activity.slugs)) {
      if (localeSlug && normalizeKey(localeSlug) === key) return activity;
    }
  }
  return undefined;
}

/** Match a DB activity row to the catalog via slug / locale slugs / name */
export function findActivityDefinitionForRow(row: {
  slug: string;
  name?: string | null;
  slugs?: Record<string, string> | null;
}): ActivityDefinition | undefined {
  const bySlug = findActivityDefinition(row.slug);
  if (bySlug) return bySlug;

  if (row.slugs) {
    for (const localeSlug of Object.values(row.slugs)) {
      if (!localeSlug) continue;
      const match = findActivityDefinition(localeSlug);
      if (match) return match;
    }
  }

  if (row.name) return findActivityDefinition(row.name);
  return undefined;
}

/** Resolve a source/alias name or slug to canonical English slug */
export function resolveActivityAlias(slugOrName: string): string | null {
  return findActivityDefinition(slugOrName)?.slug ?? null;
}

/** Localized display name from catalog; falls back to DB name */
export function getActivityDisplayName(
  slugOrId: string | number,
  locale: string,
  fallbackName?: string,
): string {
  // Numeric id is NOT portable — only use as last-resort fallback label
  if (typeof slugOrId === "number") {
    return fallbackName ?? String(slugOrId);
  }

  const activity = findActivityDefinition(slugOrId);
  if (!activity) return fallbackName ?? slugOrId;

  const loc = locale as ActivityLocale;
  return (
    activity.names[loc] ||
    activity.names.en ||
    activity.name ||
    fallbackName ||
    slugOrId
  );
}

/** Localized display name for a DB row */
export function getActivityDisplayNameForRow(
  row: { slug: string; name?: string | null; slugs?: Record<string, string> | null },
  locale: string,
): string {
  const activity = findActivityDefinitionForRow(row);
  if (!activity) return row.name ?? row.slug;
  const loc = locale as ActivityLocale;
  return activity.names[loc] || activity.names.en || activity.name || row.name || row.slug;
}

/** Localized URL slug */
export function getActivityLocaleSlug(
  slugOrName: string,
  locale: string,
): string | undefined {
  const activity = findActivityDefinition(slugOrName);
  if (!activity) return undefined;
  const loc = locale as ActivityLocale;
  return activity.slugs[loc] || activity.slugs.en || activity.slug;
}

/** Whether a search term matches an activity in any locale */
export function activityMatchesSearch(
  row: { slug: string; name?: string | null; slugs?: Record<string, string> | null },
  search: string,
): boolean {
  const q = normalizeKey(search);
  if (!q) return true;

  const activity = findActivityDefinitionForRow(row);
  if (!activity) {
    return (
      normalizeKey(row.name ?? "").includes(q) ||
      normalizeKey(row.slug).includes(q)
    );
  }

  if (normalizeKey(activity.name).includes(q)) return true;
  if (normalizeKey(activity.slug).includes(q)) return true;
  for (const name of Object.values(activity.names)) {
    if (name && normalizeKey(name).includes(q)) return true;
  }
  for (const slug of Object.values(activity.slugs)) {
    if (slug && normalizeKey(slug).includes(q)) return true;
  }
  for (const legacy of activity.legacySlugs ?? []) {
    if (normalizeKey(legacy).includes(q)) return true;
  }
  return false;
}

/**
 * Should this DB row appear in category filters?
 * - Hide junk
 * - Hide pure alias duplicates when a better canonical row already exists
 * - Keep alias-only rows that are the sole representative (e.g. prod "gym")
 */
export function shouldListActivityRow(
  row: { slug: string; name?: string | null; slugs?: Record<string, string> | null },
  allSlugs: Set<string>,
): boolean {
  if (ACTIVITY_JUNK_SLUGS.has(row.slug)) return false;

  const def = findActivityDefinitionForRow(row);
  if (!def) return false;

  // Prefer English canonical slug when both canonical + alias rows exist
  if (ACTIVITY_ALIAS_ONLY_SLUGS.has(row.slug)) {
    if (allSlugs.has(def.slug)) return false;
    // Also hide if another legacy/primary slug for same category exists
    for (const legacy of def.legacySlugs ?? []) {
      if (legacy !== row.slug && allSlugs.has(legacy) && !ACTIVITY_ALIAS_ONLY_SLUGS.has(legacy)) {
        return false;
      }
    }
  }

  // Dedupe: if this row is a French primary slug and English canonical also exists, hide this one
  if (row.slug !== def.slug && allSlugs.has(def.slug)) {
    return false;
  }

  // Dedupe multiple legacy representations of same catalog entry — keep one
  // Prefer: english slug > non-alias legacy > alias
  return true;
}

/** Pick the best DB row per catalog entry (for listing) */
export function pickCanonicalRows<T extends { slug: string; name?: string | null; slugs?: Record<string, string> | null }>(
  rows: T[],
): T[] {
  const allSlugs = new Set(rows.map((r) => r.slug));
  const byCatalogSlug = new Map<string, T>();

  const rank = (slug: string, def: ActivityDefinition): number => {
    if (slug === def.slug) return 0;
    if (ACTIVITY_ALIAS_ONLY_SLUGS.has(slug)) return 2;
    return 1; // legacy primary (a non-alias slug retained from an earlier import)
  };

  for (const row of rows) {
    if (ACTIVITY_JUNK_SLUGS.has(row.slug)) continue;
    const def = findActivityDefinitionForRow(row);
    if (!def) continue;
    if (!shouldListActivityRow(row, allSlugs)) continue;

    const existing = byCatalogSlug.get(def.slug);
    if (!existing) {
      byCatalogSlug.set(def.slug, row);
      continue;
    }
    if (rank(row.slug, def) < rank(existing.slug, def)) {
      byCatalogSlug.set(def.slug, row);
    }
  }

  return [...byCatalogSlug.values()];
}

/** All canonical English slugs from the code catalog */
export function getCatalogCanonicalSlugs(): string[] {
  return Object.keys(ACTIVITY_CATALOG);
}

/** Route params for useSetI18nParams on category pages */
export function getCategoryI18nParams(
  canonicalSlug: string,
): Record<string, { categories: string }> {
  const activity = ACTIVITY_CATALOG[canonicalSlug] ?? findActivityDefinition(canonicalSlug);
  if (!activity) return {};

  const params: Record<string, { categories: string }> = {};
  for (const loc of ACTIVITY_LOCALES) {
    params[loc] = {
      categories: getActivityLocaleSlug(activity.slug, loc) ?? activity.slug,
    };
  }
  return params;
}

/** Route params for useSetI18nParams on category × city pages */
export function getCategoryCityI18nParams(
  canonicalSlug: string,
  citySlug: string,
): Record<string, { categories: string; cities: string }> {
  const params: Record<string, { categories: string; cities: string }> = {};
  for (const [loc, categoryParams] of Object.entries(getCategoryI18nParams(canonicalSlug))) {
    params[loc] = { ...categoryParams, cities: citySlug };
  }
  return params;
}

/** Locale-aware category URL path (leading slash, no origin) */
export function buildCategoryPath(
  locale: string,
  canonicalSlug: string,
  citySlug?: string,
): string {
  const categorySlug =
    getActivityLocaleSlug(canonicalSlug, locale) ?? canonicalSlug;
  const localePrefix = locale === "fr" ? "" : `/${locale}`;
  const cityPart = citySlug ? `/${citySlug}` : "";
  return `${localePrefix}/categories/${categorySlug}${cityPart}`;
}

/**
 * 301 target when a category slug is an alias or wrong for the locale.
 * Returns null when the incoming slug is already correct.
 */
export function resolveCategoryRedirectPath(
  locale: string,
  incomingCategorySlug: string,
  citySlug?: string,
): string | null {
  const def = findActivityDefinition(incomingCategorySlug);
  if (!def) return null;

  const expectedSlug = getActivityLocaleSlug(def.slug, locale);
  if (
    !expectedSlug ||
    normalizeKey(incomingCategorySlug) === normalizeKey(expectedSlug)
  ) {
    return null;
  }

  return buildCategoryPath(locale, def.slug, citySlug);
}

/** hreflang alternates for sitemap entries */
export function buildCategorySitemapAlternatives(
  canonicalSlug: string,
  citySlug?: string,
  siteUrl = "https://example-directory.com",
): Array<{ hreflang: string; href: string }> {
  return ACTIVITY_LOCALES.map((loc) => ({
    hreflang: LOCALE_HREFLANG[loc],
    href: `${siteUrl}${buildCategoryPath(loc, canonicalSlug, citySlug)}`,
  }));
}

/**
 * Discipline families for hub "similar categories" and mega-menu *descriptions*
 * (content-architecture.md §4.1). Not the navbar layout — chrome is compact.
 * Canonical slugs; compact nav intersects MOST_SEARCHED_CATEGORIES with live hubs
 * (same listActivities filter as the sitemap).
 *
 * SAMPLE structure — labelKey values are i18n keys each instantiation defines.
 */
export const CATEGORY_FAMILIES: Array<{ id: string; labelKey: string; categories: string[] }> = [
  {
    id: 'wellness',
    labelKey: 'nav.families.fitness',
    categories: ['fitness', 'yoga', 'spa'],
  },
];

/**
 * Curated "most searched" categories for compact surfaces that cannot list
 * every live hub (data-backed by GSC category-query traffic).
 */
export const MOST_SEARCHED_CATEGORIES = [
  'fitness',
  'yoga',
  'spa',
] as const;

/** Sibling hubs in the same family, for the pillar "similar categories" module. */
export function siblingCategorySlugs(canonicalSlug: string, limit = 3): string[] {
  const family = CATEGORY_FAMILIES.find(entry => entry.categories.includes(canonicalSlug))
  if (!family) return []
  return family.categories.filter(slug => slug !== canonicalSlug).slice(0, limit)
}
