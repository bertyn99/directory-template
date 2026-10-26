import { useDrizzle } from '#imports'
import { venues } from '~~/server/db/schemas'
import { eq, sql } from 'drizzle-orm'
import { translateText } from './deepl'

/** Simple semaphore for DeepL API rate limiting */
let activeTranslations = 0
const MAX_CONCURRENT_DEEPL = 5

async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  while (activeTranslations >= MAX_CONCURRENT_DEEPL) {
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  activeTranslations++
  try {
    return await fn()
  } finally {
    activeTranslations--
  }
}

/** Locales the app actively supports */
const ACTIVE_LOCALES = ['fr', 'en', 'de', 'es', 'it', 'pt'] as const

type LocaleContent = { text: string; intro: string }
type Description = Record<string, LocaleContent>
type ManualEdits = Record<string, boolean>

/**
 * Auto-translate a venue's description to all active locales.
 *
 * - Reads the source content from `venues.description` JSONB column
 * - Skips locales where `venues.isManuallyEdited[locale]` is true
 * - Calls DeepL for each remaining target locale (parallel with error isolation)
 * - Writes translations back into `venues.description`
 *
 * @param venueId       The venue to translate
 * @param sourceLocale Locale of the existing human-written content (e.g. 'fr')
 */
export async function translateVenue(
  venueId: number,
  sourceLocale: string,
): Promise<void> {
  const db = useDrizzle()

  // 1. Fetch the venue row
  const [venue] = await db
    .select({
      description: venues.description,
      isManuallyEdited: venues.isManuallyEdited,
    })
    .from(venues)
    .where(eq(venues.id, venueId))
    .limit(1)

  if (!venue?.description) {
    return
  }

  const description = venue.description as Description
  const isManuallyEdited = (venue.isManuallyEdited ?? {}) as ManualEdits
  const sourceContent = description[sourceLocale]

  if (!sourceContent?.text) {
    return
  }

  // 2. Determine which locales need translation (exclude source + manually edited)
  const targetLocales = ACTIVE_LOCALES.filter(
    (locale) => locale !== sourceLocale && !isManuallyEdited[locale],
  )

  if (targetLocales.length === 0) {
    return
  }

  // 3. Collect translation results
  const results = await Promise.allSettled(
    targetLocales.map(async (targetLocale) => {
      const [textResult, introResult] = await Promise.allSettled([
        withRateLimit(() => translateText(sourceContent.text, sourceLocale, targetLocale)),
        sourceContent.intro
          ? withRateLimit(() => translateText(sourceContent.intro, sourceLocale, targetLocale))
          : Promise.resolve(undefined),
      ])

      const translatedText =
        textResult.status === 'fulfilled' ? textResult.value : undefined
      const translatedIntro =
        introResult.status === 'fulfilled' ? introResult.value : undefined

      // Skip if translation is identical to source (likely failed silently)
      if (translatedText === sourceContent.text && targetLocale !== sourceLocale) {
        return { locale: targetLocale, success: false }
      }

      if (!translatedText && !translatedIntro) {
        return { locale: targetLocale, success: false }
      }

      return {
        locale: targetLocale,
        success: true,
        text: translatedText || '',
        intro: translatedIntro || '',
      }
    }),
  )
  for (const r of results) {
    if (r.status === 'rejected') {
      console.error(`[autoTranslate] Venue ${venueId}: locale translation rejected:`, r.reason?.message || r.reason)
    }
  }

  // 4. Persist translations using jsonb_set (atomic per-locale writes)
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.success) {
      const { locale, text, intro } = result.value
      await db.execute(sql`
        UPDATE venues SET description = jsonb_set(
          coalesce(description, '{}'::jsonb),
          ARRAY[${locale}]::text[],
          ${JSON.stringify({ text, intro })}::jsonb,
          true
        ) WHERE id = ${venueId}
      `)
    }
  }

  // 5. Log results
  const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length
  const failed = results.length - succeeded
  if (failed > 0) {
    console.warn(`[autoTranslate] Venue ${venueId}: ${succeeded} locales translated, ${failed} failed`)
  } else if (succeeded > 0) {
    console.log(`[autoTranslate] Venue ${venueId}: ${succeeded} locales translated successfully`)
  }
}
