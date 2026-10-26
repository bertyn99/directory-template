import { ACTIVITIES } from "~~/shared/activities";
import type { ActivityId } from "~~/shared/activities";
import type { ActivityData } from "./parser";

export type Locale = "fr" | "en" | "de" | "es" | "it";

export interface ProviderActivity {
  sourceName: string;
  sourceSlug: string;
  activityId?: ActivityId;
  keywords: Partial<Record<Locale, string[]>>;
}

/**
 * Sample provider → catalog mappings for the two REFERENCE sources.
 * PLACEHOLDER SAMPLES — each instantiation maps its own sources' activities
 * to its own catalog entries (ACTIVITIES ids from ~~/shared/activities).
 */
export const FITNESSPARK_ACTIVITIES: ProviderActivity[] = [
  {
    sourceName: "Fitness",
    sourceSlug: "fitness",
    activityId: ACTIVITIES.FITNESS,
    keywords: {
      fr: ["fitness", "musculation", "salle de sport"],
      en: ["fitness", "gym"],
      de: ["fitness", "fitnessstudio"],
      es: ["fitness", "gimnasio"],
      it: ["fitness", "palestra"],
    },
  },
  {
    sourceName: "Yoga",
    sourceSlug: "yoga",
    activityId: ACTIVITIES.YOGA,
    keywords: {
      fr: ["yoga"],
      en: ["yoga"],
      de: ["yoga"],
      es: ["yoga"],
      it: ["yoga"],
    },
  },
  {
    sourceName: "Spa",
    sourceSlug: "spa",
    activityId: ACTIVITIES.SPA,
    keywords: {
      fr: ["spa", "bien-être"],
      en: ["spa", "wellness"],
      de: ["spa", "wellness"],
      es: ["spa", "bienestar"],
      it: ["spa", "benessere"],
    },
  },
];

export const MASALLEDESPORT_ACTIVITIES: ProviderActivity[] = [
  {
    sourceName: "Fitness",
    sourceSlug: "fitness",
    activityId: ACTIVITIES.FITNESS,
    keywords: {
      fr: ["fitness", "remise en forme"],
      en: ["fitness"],
      de: ["fitness"],
      es: ["fitness"],
      it: ["fitness"],
    },
  },
  {
    sourceName: "Yoga",
    sourceSlug: "yoga",
    activityId: ACTIVITIES.YOGA,
    keywords: {
      fr: ["yoga"],
      en: ["yoga"],
      de: ["yoga"],
      es: ["yoga"],
      it: ["yoga"],
    },
  },
  {
    sourceName: "Spa",
    sourceSlug: "spa",
    activityId: ACTIVITIES.SPA,
    keywords: {
      fr: ["spa"],
      en: ["spa"],
      de: ["spa"],
      es: ["spa"],
      it: ["spa"],
    },
  },
];

export interface MatchResult {
  activityId: number | null;
  method: "direct" | "keyword" | "unknown";
  confidence: number;
}

function allKeywords(pa: ProviderActivity): string[] {
  const set = new Set<string>();
  set.add(pa.sourceName.toLowerCase());
  for (const kw of Object.values(pa.keywords).flat()) {
    if (kw) set.add(kw.toLowerCase());
  }
  return [...set];
}

function matchByKeywords(sourceName: string, defs: ProviderActivity[]): ProviderActivity | null {
  const name = sourceName.toLowerCase().trim();
  if (!name) return null;
  const exact = defs.find((d) => d.sourceName.toLowerCase() === name);
  if (exact) return exact;
  for (const def of defs) {
    if (allKeywords(def).includes(name)) return def;
  }
  const words = name.split(/[\s\-_()]+/).filter((w) => w.length > 2);
  if (words.length === 0) return null;
  let best: ProviderActivity | null = null;
  let bestScore = 0;
  for (const def of defs) {
    const kwSet = allKeywords(def);
    let score = 0;
    for (const word of words) {
      for (const kw of kwSet) {
        if (kw.includes(word) || word.includes(kw)) {
          score += word.length;
          break;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = def;
    }
  }
  return bestScore > 0 ? best : null;
}

export function matchActivity(
  sourceName: string,
  provider: "fitnesspark" | "masalledesport",
): MatchResult {
  const defs =
    provider === "fitnesspark"
      ? FITNESSPARK_ACTIVITIES
      : MASALLEDESPORT_ACTIVITIES;
  const exact = defs.find((d) => d.sourceName.toLowerCase() === sourceName.toLowerCase().trim());
  if (exact?.activityId) return { activityId: exact.activityId, method: "direct", confidence: 1 };
  const kw = matchByKeywords(sourceName, defs);
  if (kw?.activityId) return { activityId: kw.activityId, method: "keyword", confidence: 0.85 };
  return { activityId: null, method: "unknown", confidence: 0 };
}

/**
 * masalledesport.com activity slugs (raw.activities[].slug) → catalog slug
 * variants. SAMPLE mapping — each instantiation maps its source's real slugs.
 */
const MASALLEDESPORT_SLUG_TO_VARIANTS: Record<string, string[]> = {
  fitness: ["fitness"],
  yoga: ["yoga"],
  spa: ["spa"],
};

function mapSlugsFromList(
  list: unknown[],
  map: Record<string, string[]>,
  field: "slug" | "name" = "slug",
): string[] {
  const variants = new Set<string>();
  for (const item of list) {
    const slug = (item as Record<string, unknown> | null)?.[field];
    if (typeof slug !== "string") continue;
    for (const variant of map[slug.toLowerCase().trim()] ?? []) {
      variants.add(variant);
    }
  }
  return [...variants];
}

/**
 * Derive candidate activity slugs for a scraped venue from its stored raw payload.
 * Returns slug VARIANTS (the shared ACTIVITIES constants are seed ids that do
 * NOT hold in every environment). Callers resolve against their environment's
 * activities table with WHERE slug IN (variants) and insert only the hits.
 *
 *  - masalledesport: top-level raw.activities[].slug → sample variant map
 *  - anything else: [] (no derivation available)
 */
export function deriveActivitySlugsFromSource(sourceCode: string, raw: unknown): string[] {
  if (sourceCode === "masalledesport") {
    // Activities live at the TOP level: { name, …, activities: [{ slug, … }], … }
    const payload = raw as Record<string, unknown> | null;
    const activities = payload?.activities;
    if (!Array.isArray(activities)) return [];
    return mapSlugsFromList(activities, MASALLEDESPORT_SLUG_TO_VARIANTS);
  }

  // fitnesspark: raw stores scraped HTML only (activity data is JS-rendered,
  // not available server-side) — no derivation possible.
  return [];
}

export function getStaticActivities(
  provider: "fitnesspark" | "masalledesport",
  buildUrl: (slug: string) => string,
): ActivityData[] {
  const defs =
    provider === "fitnesspark"
      ? FITNESSPARK_ACTIVITIES
      : MASALLEDESPORT_ACTIVITIES;
  return defs.map((a) => ({ name: a.sourceName, url: buildUrl(a.sourceSlug) }));
}

export async function matchActivityWithAI(
  sourceName: string,
  sourceCode: string,
  dbActivities: Array<{ id: number; name: string }>,
): Promise<MatchResult> {
  try {
    const config = useRuntimeConfig(event);
    if (!config.geminiApiKey) return { activityId: null, method: "unknown", confidence: 0 };
    const prompt = `Map this activity to our DB: "${sourceName}" (${sourceCode}). DB: ${dbActivities.map((a) => a.name).join(", ")}. Return the exact DB name or UNKNOWN.`;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${config.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 50 },
        }),
      },
    );
    if (!res.ok) return { activityId: null, method: "unknown", confidence: 0 };
    const data = await res.json();
    const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "UNKNOWN").trim();
    if (text === "UNKNOWN") return { activityId: null, method: "unknown", confidence: 0 };
    const matched = dbActivities.find((a) => a.name.toLowerCase() === text.toLowerCase());
    return matched
      ? { activityId: matched.id, method: "unknown", confidence: 0.7 }
      : { activityId: null, method: "unknown", confidence: 0 };
  } catch {
    return { activityId: null, method: "unknown", confidence: 0 };
  }
}
