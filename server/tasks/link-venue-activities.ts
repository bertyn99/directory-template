import { inArray, isNotNull } from "drizzle-orm";
import { activities, venueActivities, venueSources } from "~~/server/db/schemas";
import { deriveActivitySlugsFromSource } from "~~/server/services/scraping/activities";

const CHUNK_SIZE = 500;

/**
 * Backfill venue_activities by re-deriving slug variants from stored
 * venue_sources.raw payloads (idempotent — onConflictDoNothing).
 *
 * Runs derivation for every source; sources without a derivation branch
 * (e.g. fitnesspark — see the deriveActivitySlugsFromSource docs) simply yield [].
 * Run on demand: POST /_nitro/tasks/link-venue-activities
 */
export default defineTask({
  meta: {
    name: "link-venue-activities",
    description:
      "Backfill venue_activities from venue_sources.raw derivations (idempotent, all sources)",
  },
  async run() {
    const db = useDrizzle();

    const rows = await db
      .select({
        id: venueSources.id,
        venueId: venueSources.venueId,
        sourceCode: venueSources.sourceCode,
        raw: venueSources.raw,
      })
      .from(venueSources)
      .where(isNotNull(venueSources.venueId));

    // 1. Derive slug variants per linked source row
    const perRow: Array<{ venueId: number; slugs: string[] }> = [];
    const allSlugs = new Set<string>();
    const withoutDerivation = new Map<string, number>();
    for (const row of rows) {
      if (row.venueId === null || row.raw === null) continue;
      const slugs = deriveActivitySlugsFromSource(row.sourceCode, row.raw);
      if (slugs.length === 0) {
        withoutDerivation.set(row.sourceCode, (withoutDerivation.get(row.sourceCode) ?? 0) + 1);
        continue;
      }
      perRow.push({ venueId: row.venueId, slugs });
      for (const slug of slugs) allSlugs.add(slug);
    }

    // 2. Resolve variants against this environment's activities table
    const activityRows = allSlugs.size
      ? await db
          .select({ id: activities.id, slug: activities.slug })
          .from(activities)
          .where(inArray(activities.slug, [...allSlugs]))
      : [];
    const slugToId = new Map(activityRows.map((a) => [a.slug, a.id]));

    // 3. Dedup (venueId, activityId) pairs across rows
    const pairs = new Map<string, { venueId: number; activityId: number }>();
    let unresolvedSlugs = 0;
    for (const { venueId, slugs } of perRow) {
      for (const slug of slugs) {
        const activityId = slugToId.get(slug);
        if (activityId === undefined) {
          unresolvedSlugs += 1;
          continue;
        }
        pairs.set(`${venueId}:${activityId}`, { venueId, activityId });
      }
    }

    // 4. Insert in chunks, skipping existing links
    const values = [...pairs.values()];
    let inserted = 0;
    for (let i = 0; i < values.length; i += CHUNK_SIZE) {
      const chunk = values.slice(i, i + CHUNK_SIZE);
      const res = await db
        .insert(venueActivities)
        .values(chunk)
        .onConflictDoNothing()
        .returning({ venueId: venueActivities.venueId });
      inserted += res.length;
    }

    const summary = {
      sourcesProcessed: rows.length,
      sourcesWithDerivation: perRow.length,
      uniquePairs: values.length,
      inserted,
      unresolvedSlugRefs: unresolvedSlugs,
      sourcesWithoutDerivation: Object.fromEntries(withoutDerivation),
    };
    console.log("[link-venue-activities]", summary);
    return { result: summary };
  },
});
