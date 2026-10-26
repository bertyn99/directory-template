import { activities } from "~~/server/db/schemas";
import { useDrizzle } from "~~/server/utils/drizzle";
import {
  ACTIVITY_CATALOG,
  activityMatchesSearch,
  findActivityDefinition,
  findActivityDefinitionForRow,
  getActivityDisplayNameForRow,
  pickCanonicalRows,
} from "~~/shared/activities";

/**
 * Get all activity slugs for sitemap generation
 */
export async function getAllActivitySlugs() {
  return useDrizzle()
    .select({ slug: activities.slug })
    .from(activities);
}

export type ListedActivity = {
  id: number;
  name: string;
  slug: string;
  slugs: Record<string, string> | null;
  thematiqueId: number | null;
};

/**
 * List canonical activities with locale-aware display names.
 * Identity is English slug (catalog), not DB id — ids differ across envs.
 * Alias-only rows are folded into the canonical category.
 */
export async function listActivities(
  search?: string,
  locale = "en",
): Promise<ListedActivity[]> {
  const rows = await useDrizzle()
    .select({
      id: activities.id,
      name: activities.name,
      slug: activities.slug,
      slugs: activities.slugs,
      thematiqueId: activities.thematiqueId,
    })
    .from(activities);

  const canonical = pickCanonicalRows(rows)
    .filter((row) => activityMatchesSearch(row, search ?? ""))
    .map((row) => {
      const def = findActivityDefinitionForRow(row);
      const localizedSlugs = {
        ...(row.slugs ?? {}),
        ...(def?.slugs ?? {}),
      } as Record<string, string>;

      return {
        id: row.id,
        name: getActivityDisplayNameForRow(row, locale),
        // Expose English canonical slug for stable client identity
        slug: def?.slug ?? row.slug,
        slugs: localizedSlugs,
        thematiqueId: row.thematiqueId,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  return canonical;
}

/** Get activity by slug: direct match first, then catalog aliases. */
export async function getActivityBySlug(slug: string, _locale?: string) {
  const db = useDrizzle();

  // 1. Direct DB slug match (works for English canonical slugs)
  const byDirect = await db.query.activities.findFirst({
    where: { slug },
  });
  if (byDirect) return byDirect;

  // 2. Catalog-based lookup (handles aliases, legacy slugs, locale slugs)
  const catalog = findActivityDefinition(slug);
  if (catalog) {
    const candidates = [
      catalog.slug,
      ...(catalog.legacySlugs ?? []),
      ...Object.values(catalog.slugs).filter(Boolean),
    ];
    for (const candidate of candidates) {
      if (candidate === slug) continue;
      const byCandidate = await db.query.activities.findFirst({
        where: { slug: candidate },
      });
      if (byCandidate) return byCandidate;
    }
  }

  return null;
}

/** Catalog entry lookup helper for other modules */
export function getCatalogActivity(slug: string) {
  return ACTIVITY_CATALOG[slug] ?? findActivityDefinition(slug);
}
