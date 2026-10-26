import { eq } from "drizzle-orm";
import pLimit from "p-limit";
import { activities } from "~~/server/db/schemas";
import { generateContent } from "~~/server/db/service/contentGen";
import {
  hubIntroFromLegacyJsonb,
  hubMarkdownExists,
  writeHubMarkdown,
} from "~~/server/services/category-hub-markdown";
import {
  ACTIVITY_ALIAS_SLUGS,
  findActivityDefinition,
  getActivityDisplayName,
} from "~~/shared/activities";
import { excerptPlainText, isContentLocale, type ContentLocale } from "~~/shared/silo";

const ARRAY_FIELDS = ["techniques", "keyPoints", "competitions", "equipments", "contraindications", "benefits"] as const;

const DEFAULT_LOCALES = ["fr", "en"];
const ACTIVITY_CONCURRENCY = 3;

function needsGeneration(
  field: Record<string, unknown> | null,
  locales: string[],
): boolean {
  if (!field || Object.keys(field).length === 0) return true;
  return locales.some((locale) => !field[locale]);
}

function parseJsonFromText(text: string): unknown {
  const attempt = (candidate: string): unknown => {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      return undefined;
    }
  };

  // Direct JSON or closed markdown fence
  const direct = attempt(
    text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim(),
  );
  if (direct !== undefined) return direct;

  // Unclosed/truncated fence: extract the first balanced top-level {...} block
  const start = text.indexOf("{");
  if (start === -1) {
    throw new Error(
      `Failed to parse Gemini response: ${text.substring(0, 200)}`,
    );
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        const parsed = attempt(text.slice(start, i + 1));
        if (parsed !== undefined) return parsed;
      }
    }
  }
  throw new Error(
    `Failed to parse Gemini response (unbalanced or truncated): ${text.substring(0, 200)}`,
  );
}

function validateContent(
  parsed: unknown,
  expectedLocales: string[],
): Record<string, Array<string | { title: string, description: string }>> {
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`Gemini returned non-object: ${typeof parsed}`);
  }

  const result: Record<string, Array<string | { title: string, description: string }>> = {};
  const obj = parsed as Record<string, unknown>;
  // Map bracket-wrapped keys like "[fr,en]" → split into individual locales
  for (const [key, value] of Object.entries(obj)) {
    const locales = key.startsWith("[") && key.endsWith("]")
      ? key.slice(1, -1).split(",")
      : [key];

    if (!Array.isArray(value)) {
      throw new Error(`Invalid value for locale "${key}": expected string[], got ${typeof value}`);
    }

    const items = value.map((v) => {
      if (typeof v !== "string" && typeof v !== "object") {
        throw new Error(`Invalid item in locale "${key}": expected string or object, got ${typeof v}`);
      }
      return v as string | { title: string, description: string };
    });
    for (const locale of locales) {
      result[locale] = items;
    }
  }

  // Verify we got at least one expected locale
  const foundLocales = expectedLocales.filter((l) => result[l]);
  if (foundLocales.length === 0) {
    throw new Error(
      `Gemini returned no expected locales. Expected: [${expectedLocales.join(",")}], got keys: [${Object.keys(obj).join(",")}]`,
    );
  }

  return result;
}

type LocalizedArray = Record<string, Array<string | { title: string, description: string }>>

function mergeContent(
  existing: Record<string, unknown> | null,
  generated: LocalizedArray,
): LocalizedArray {
  return {
    ...((existing as LocalizedArray) ?? {}),
    ...generated,
  };
}

function defaultHubFaq(categoryName: string, locale: ContentLocale): Array<{ q: string, a: string }> {
  switch (locale) {
    case "fr":
      return [
        { q: `Où pratiquer le ${categoryName} près de chez moi ?`, a: `Utilisez les villes de la page ${categoryName} pour ouvrir la liste des venues, puis contactez la salle pour un essai.` },
        { q: `Combien coûte un venue de ${categoryName} ?`, a: `Les tarifs varient selon la ville et la formule. Demandez le détail et l'essai directement au venue.` },
        { q: `Peut-on pratiquer le ${categoryName} en enfant ?`, a: `Beaucoup de venues proposent des cours enfants. Vérifiez l'âge minimum et les créneaux sur la fiche du venue.` },
        { q: `Comment réserver un cours d'essai de ${categoryName} ?`, a: `Ouvrez une fiche venue, contactez-les et demandez un essai. La plupart des salles proposent un premier cours gratuit ou à petit prix.` },
        { q: `Faut-il une licence pour pratiquer le ${categoryName} ?`, a: `Souvent oui, via la fédération du venue. Demandez ce que la cotisation inclut avant de vous engager.` },
      ]
    case "en":
      return [
        { q: `Where can I train ${categoryName} near me?`, a: `Use the cities on the ${categoryName} page to open the venue list, then contact the gym for a trial.` },
        { q: `How much does a ${categoryName} venue cost?`, a: `Prices vary by city and membership. Ask the venue directly for fees and a trial class.` },
        { q: `Can children practice ${categoryName}?`, a: `Many venues run kids' classes. Check the minimum age and schedule on the venue page.` },
        { q: `How do I book a ${categoryName} trial class?`, a: `Open a venue page, contact them, and ask for a trial. Most gyms offer a first class free or at a low price.` },
        { q: `Do I need a licence to practice ${categoryName}?`, a: `Often yes, through the venue's federation. Ask what the membership includes before you commit.` },
      ]
    case "de":
    case "es":
    case "it":
    case "pt":
      return defaultHubFaq(categoryName, "en")
    default: {
      const unreachable: never = locale
      return unreachable
    }
  }
}

export default defineTask({
  meta: {
    name: "generate-category-content",
      description:
        "Auto-generate category content for activities. Payload: { force?: boolean, fields?: string[], locales?: string[] }. Defaults to fr/en.",
  },
  async run({ payload }) {
    const config = useRuntimeConfig();
    if (!config.geminiApiKey) {
      console.error("GEMINI_API_KEY is not set");
      return { result: "error", message: "GEMINI_API_KEY missing" };
    }

    const locales = ((payload?.locales as string[] | undefined) ??
      DEFAULT_LOCALES) as string[];
    const forceContent = payload?.force === true || payload?.force === "true";
    const rawFields = payload?.fields;
    const fieldFilter = rawFields
      ? (Array.isArray(rawFields) ? rawFields : [rawFields as string])
      : undefined;

    const db = useDrizzle();

    const allActivities = await db.query.activities.findMany({
      columns: {
        id: true,
        name: true,
        slug: true,
        techniques: true,
        keyPoints: true,
        competitions: true,
        equipments: true,
        contraindications: true,
        benefits: true,
        content: true,
      },
    });

    // Check activities needing array field generation
    const shouldRegenerateArrays = !fieldFilter || fieldFilter.some((f) => ARRAY_FIELDS.includes(f as typeof ARRAY_FIELDS[number]));
    const needsArrayFields = (forceContent && shouldRegenerateArrays)
      ? allActivities
      : allActivities.filter((activity) =>
          ARRAY_FIELDS.some((field) =>
            needsGeneration(
              activity[field] as Record<string, unknown> | null,
              locales,
            ),
          ),
        );

    // Hub markdown lives in content/{locale}/category-guides/{slug}/hub.md — never JSONB.
    const shouldRegenerateMarkdown = !fieldFilter || fieldFilter.includes("content");
    const needsMarkdownContent = shouldRegenerateMarkdown ? allActivities : [];

    // Filter out known alias slugs — content lives on the canonical activity
    const needsContent = [...new Map(
      [...needsArrayFields, ...needsMarkdownContent]
        .filter((a) => !ACTIVITY_ALIAS_SLUGS.has(a.slug))
        .map((a) => [a.id, a]),
    ).values()];

    const skippedDuplicates = [...needsArrayFields, ...needsMarkdownContent]
      .filter((a) => ACTIVITY_ALIAS_SLUGS.has(a.slug)).length;
    const totalNeedingContent = needsMarkdownContent.length;
    const totalNeedingArrays = needsArrayFields.length;
    console.log(
      `[generate-category-content] ${needsContent.length}/${allActivities.length} activities to process (${totalNeedingContent} need content, ${totalNeedingArrays} need array fields, ${skippedDuplicates} duplicates skipped) for [${locales.join(", ")}]`,
    );

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    const limit = pLimit(ACTIVITY_CONCURRENCY);

    const results = await Promise.allSettled(
      needsContent.map((activity) =>
        limit(async () => {
          console.log(`Processing: ${activity.name} (${activity.slug})`);
          const updates: Record<string, unknown> = {};
          const errors: string[] = [];

          // --- Parallel Gemini calls for this activity ---
          const parallelTasks: Promise<void>[] = [];

          const shouldRegenerateContent = !fieldFilter || fieldFilter.includes("content");
          const currentContent = activity.content as Record<string, string> | null;
          const canonicalSlug = findActivityDefinition(activity.slug)?.slug ?? activity.slug;
          const hubLocales = shouldRegenerateContent
            ? locales.filter((locale): locale is ContentLocale => isContentLocale(locale))
            : [];

          let wroteHub = false
          for (const locale of hubLocales) {
            parallelTasks.push((async () => {
              const exists = await hubMarkdownExists(locale, canonicalSlug);
              if (exists && !forceContent) return;

              const categoryName = getActivityDisplayName(canonicalSlug, locale, activity.name);
              const legacy = currentContent?.[locale];
              if (legacy && !forceContent) {
                await writeHubMarkdown({
                  locale,
                  canonicalSlug,
                  title: `${categoryName} : trouvez votre venue`,
                  description: excerptPlainText(legacy, 60),
                  intro: hubIntroFromLegacyJsonb(legacy),
                  faq: defaultHubFaq(categoryName, locale),
                  translationKey: `hub-${canonicalSlug}`,
                });
                wroteHub = true
                return;
              }

              const rawText = await generateContent({
                type: "category",
                subType: "content",
                data: { name: activity.name },
                languages: locale,
              });
              const parsed = parseJsonFromText(rawText) as {
                title?: unknown
                description?: unknown
                intro?: unknown
                faq?: unknown
              };
              const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
              const description = typeof parsed.description === "string" ? parsed.description.trim() : "";
              const intro = typeof parsed.intro === "string" ? parsed.intro.trim() : "";
              if (!title || !description || !intro) {
                errors.push(`Empty hub markdown for locale ${locale}`);
                return;
              }
              const faq = Array.isArray(parsed.faq)
                ? parsed.faq.filter((item): item is { q: string, a: string } =>
                    Boolean(item)
                    && typeof item === "object"
                    && typeof (item as { q?: unknown }).q === "string"
                    && typeof (item as { a?: unknown }).a === "string",
                  )
                : defaultHubFaq(categoryName, locale);
              await writeHubMarkdown({
                locale,
                canonicalSlug,
                title,
                description,
                intro,
                faq: faq.length ? faq : defaultHubFaq(categoryName, locale),
                translationKey: `hub-${canonicalSlug}`,
              });
              wroteHub = true
            })());
          }
          // Array fields (techniques, keyPoints, competitions, equipments)
          const fieldsToProcess = fieldFilter
            ? ARRAY_FIELDS.filter((f) => fieldFilter.includes(f))
            : ARRAY_FIELDS;
          const arrayFieldPromises = fieldsToProcess.map(async (field) => {
            const currentField = activity[field] as Record<string, unknown> | null;
            const missingLocales = forceContent
              ? locales
              : locales.filter(
                  (locale) => !currentField?.[locale],
                );
            if (missingLocales.length === 0) return;

            const localeStr = `[${missingLocales.join(",")}]`;
            const rawText = await generateContent({
              type: "category",
              subType: field,
              data: { name: activity.name },
              languages: localeStr,
            });
            const rawJson = parseJsonFromText(rawText);
            const validated = validateContent(rawJson, missingLocales);
            updates[field] = mergeContent(currentField, validated);
          });

          await Promise.all([...parallelTasks, ...arrayFieldPromises]);

          if (errors.length > 0) {
            throw new Error(errors.join("; "));
          }

          if (Object.keys(updates).length > 0) {
            await db
              .update(activities)
              .set(updates)
              .where(eq(activities.id, activity.id));
            console.log(`  ✓ Saved content for ${activity.name}`);
            return "processed" as const;
          }
          if (wroteHub) {
            console.log(`  ✓ Wrote hub markdown for ${activity.name}`);
            return "processed" as const;
          }
          return "skipped" as const;
        }),
      ),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value === "processed") processed++;
        else if (result.value === "skipped") skipped++;
      } else {
        console.error(`  ✗ Failed:`, result.reason);
        failed++;
      }
    }

    const message = `Done. Processed: ${processed}, Skipped: ${skipped}, Failed: ${failed}`;
    console.log(`[generate-category-content] ${message}`);
    return { result: "success", processed, skipped, failed, total: needsContent.length };
  },
});
