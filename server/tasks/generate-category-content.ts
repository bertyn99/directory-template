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
import { directoryConfig } from "~~/directory.config";
import { excerptPlainText, isContentLocale, type ContentLocale } from "~~/shared/silo";

// "competitions" is deliberately NOT in the set: sports-shaped dead weight
// for the neutral template (the DB column stays — legacy, append-only).
const ARRAY_FIELDS = ["techniques", "keyPoints", "equipments", "contraindications", "benefits"] as const;

// Active locales (directoryConfig.locales) — the 04:00 cron then covers
// exactly the activated set; payload.locales still overrides per run.
const DEFAULT_LOCALES: string[] = [...directoryConfig.locales];
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

/**
 * NICHE-NEUTRAL fallback FAQ for generated category hubs — used when Gemini
 * returns no usable FAQ. Three venue questions that make sense for ANY
 * directory niche (pricing / booking / on-site facilities); no
 * sports-specific vocabulary (licence, trial class, federation…), so a spa
 * or padel instantiation never ships fitness-flavoured copy. Every shipped
 * locale has verified wording; unknown locales fall back to the default
 * locale's copy.
 */
function defaultHubFaq(categoryName: string, locale: ContentLocale): Array<{ q: string, a: string }> {
  switch (locale) {
    case "fr":
      return [
        { q: `Quels sont les tarifs moyens pour un ${categoryName} ?`, a: `Les tarifs varient selon la ville, la formule et les équipements. Comparez plusieurs établissements ${categoryName} et demandez le détail des prestations directement au venue avant de vous engager.` },
        { q: `Faut-il réserver à l'avance pour un ${categoryName} ?`, a: `Cela dépend des établissements : certains accueillent les visites sans rendez-vous, d'autres fonctionnent sur réservation. Contactez le venue pour confirmer les créneaux et les conditions d'accès.` },
        { q: `Quels équipements sont disponibles dans un ${categoryName} ?`, a: `L'équipement varie d'un établissement à l'autre. La fiche de chaque venue détaille les installations et les services proposés : vérifiez-les avant votre visite.` },
      ]
    case "en":
      return [
        { q: `What are the average prices for a ${categoryName}?`, a: `Prices vary by city, plan and facilities. Compare several ${categoryName} venues and ask each venue for a detailed quote before you commit.` },
        { q: `Do I need to book a ${categoryName} in advance?`, a: `It depends on the venue: some welcome drop-in visits, others work by appointment only. Contact the venue to confirm opening hours and access conditions.` },
        { q: `What facilities are available at a ${categoryName}?`, a: `Facilities differ from one venue to the next. Each venue page lists its installations and services, so check them before your visit.` },
      ]
    case "de":
      return [
        { q: `Was kostet ein ${categoryName} im Durchschnitt?`, a: `Die Preise variieren je nach Stadt, Tarif und Ausstattung. Vergleichen Sie mehrere ${categoryName}-Venues und erfragen Sie die Details direkt beim Venue, bevor Sie sich entscheiden.` },
        { q: `Muss man ein ${categoryName} im Voraus buchen?`, a: `Das hängt vom Venue ab: Manche empfangen Besucher ohne Termin, andere arbeiten nur mit Terminvereinbarung. Kontaktieren Sie das Venue, um Öffnungszeiten und Zugangsbedingungen zu klären.` },
        { q: `Welche Ausstattung ist in einem ${categoryName} verfügbar?`, a: `Die Ausstattung unterscheidet sich von Venue zu Venue. Auf der Detailseite jedes Venues sind Anlagen und Services aufgeführt. Prüfen Sie sie vor Ihrem Besuch.` },
      ]
    case "es":
      return [
        { q: `¿Cuáles son los precios medios de un ${categoryName}?`, a: `Los precios varían según la ciudad, la fórmula y los servicios. Compara varios venues de ${categoryName} y pide el detalle directamente a cada establecimiento antes de decidirte.` },
        { q: `¿Hay que reservar un ${categoryName} con antelación?`, a: `Depende del establecimiento: algunos reciben visitas sin cita, otros funcionan solo con reserva. Contacta con el venue para confirmar horarios y condiciones de acceso.` },
        { q: `¿Qué instalaciones están disponibles en un ${categoryName}?`, a: `Las instalaciones varían de un establecimiento a otro. La ficha de cada venue detalla sus instalaciones y servicios: consúltalos antes de tu visita.` },
      ]
    case "it":
      return [
        { q: `Quali sono i prezzi medi di un ${categoryName}?`, a: `I prezzi variano in base alla città, alla formula e ai servizi. Confronta diversi venue di ${categoryName} e chiedi il dettaglio direttamente a ogni stabilimento prima di decidere.` },
        { q: `Bisogna prenotare un ${categoryName} in anticipo?`, a: `Dipende dallo stabilimento: alcuni accettano visite senza appuntamento, altri funzionano solo su prenotazione. Contatta il venue per confermare orari e condizioni di accesso.` },
        { q: `Quali attrezzature sono disponibili in un ${categoryName}?`, a: `Le attrezzature variano da uno stabilimento all'altro. La scheda di ogni venue elenca impianti e servizi: controllali prima della tua visita.` },
      ]
    case "pt":
      return [
        { q: `Quais são os preços médios de um ${categoryName}?`, a: `Os preços variam conforme a cidade, o plano e as instalações. Compare vários venues de ${categoryName} e peça o detalhe diretamente a cada estabelecimento antes de decidir.` },
        { q: `É preciso reservar um ${categoryName} com antecedência?`, a: `Depende do estabelecimento: alguns recebem visitas sem marcação, outros funcionam apenas com reserva. Contacte o venue para confirmar horários e condições de acesso.` },
        { q: `Que instalações estão disponíveis num ${categoryName}?`, a: `As instalações variam de estabelecimento para estabelecimento. A ficha de cada venue lista as instalações e os serviços: verifique-os antes da sua visita.` },
      ]
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
        "Auto-generate category content for activities. Payload: { force?: boolean, fields?: string[], locales?: string[] }. Defaults to the active locales (directoryConfig.locales).",
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
          // Array fields (techniques, keyPoints, equipments)
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
