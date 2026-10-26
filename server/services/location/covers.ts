import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { useDrizzle } from "~~/server/utils/drizzle";
import { MAJOR_CITY_POPULATIONS } from "~~/server/db/data/major-cities-population";

export interface CityCoverSyncResult {
  populationsSynced: number;
  unmatched: Array<{ name: string; countryCode: string }>;
  matched: Array<{ city: string; cover: string }>;
  alreadySet: number;
  missing: string[];
}

function citySlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

/**
 * Resolve the writable cities image directory:
 * - prod (NODE_ENV=production, `node .output/server/index.mjs`):
 *   `.output/public/img/cities`
 * - dev: `public/img/cities`
 * Static assets are served from disk per request, so committed covers are
 * available immediately after deploy.
 */
function resolveCitiesImageDir(): string {
  const cwd = process.cwd();
  const devDir = join(cwd, "public", "img", "cities");
  const prodDir = join(cwd, ".output", "public", "img", "cities");
  const candidates =
    process.env.NODE_ENV === "production" ? [prodDir, devDir] : [devDir];
  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }
  mkdirSync(devDir, { recursive: true });
  return devDir;
}

/**
 * Upsert known populations for the top-30 cities (idempotent).
 * Returns the entries with no matching `cities.name` row so renames surface.
 */
async function syncMajorCityPopulations(): Promise<{
  synced: number;
  unmatched: Array<{ name: string; countryCode: string }>;
}> {
  const db = useDrizzle();
  let synced = 0;
  const unmatched: Array<{ name: string; countryCode: string }> = [];

  for (const entry of MAJOR_CITY_POPULATIONS) {
    const result = await db.execute(sql`
      UPDATE cities c
      SET population = ${entry.population}
      FROM countries co
      WHERE c.country_id = co.id
        AND c.name = ${entry.name}
        AND co.code = ${entry.countryCode}
    `);
    const rowCount =
      (result as unknown as { rowCount: number | null }).rowCount ?? 0;
    if (rowCount > 0) {
      synced++;
    } else {
      unmatched.push({ name: entry.name, countryCode: entry.countryCode });
    }
  }

  return { synced, unmatched };
}

/**
 * Match committed cover images to cities in the DB and write public paths.
 * No API calls, no image generation — covers are generated locally and
 * committed to `public/img/cities/`. This task only syncs the DB paths.
 *
 * Idempotent: run after each deploy to pick up newly committed covers.
 */
export async function syncCityCoverPaths(
  options: { force?: boolean } = {},
): Promise<CityCoverSyncResult> {
  const db = useDrizzle();
  const imageDir = resolveCitiesImageDir();

  const { synced, unmatched } = await syncMajorCityPopulations();

  const result: CityCoverSyncResult = {
    populationsSynced: synced,
    unmatched,
    matched: [],
    alreadySet: 0,
    missing: [],
  };

  for (const entry of MAJOR_CITY_POPULATIONS) {
    const filename = `${citySlug(entry.name)}.jpg`;
    const coverPath = `/img/cities/${filename}`;
    const filePath = join(imageDir, filename);

    if (!existsSync(filePath)) {
      result.missing.push(entry.name);
      continue;
    }

    const check = await db.execute(sql`
      SELECT MAX(cover) AS cover FROM cities WHERE name = ${entry.name}
    `);
    const currentCover =
      (
        (check as unknown as { rows: Array<{ cover: string | null }> })
          .rows[0]?.cover ?? null
      ) || null;

    if (!options.force && currentCover === coverPath) {
      result.alreadySet++;
      continue;
    }

    await db.execute(sql`
      UPDATE cities SET cover = ${coverPath} WHERE name = ${entry.name}
    `);
    result.matched.push({ city: entry.name, cover: coverPath });
  }

  return result;
}
