import { createHash } from 'crypto'
import { useStorage } from '#imports'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import { protectTerms, restoreTerms } from './glossary'

/**
 * Translate text via Gemini (AI SDK) with Redis-backed translation memory.
 *
 * Flow:
 * 1. Hash source text → lookup in Redis (key: tm:{hash}:{src}:{tgt})
 * 2. Cache hit → return stored translation
 * 3. Cache miss → protect glossary terms → call Gemini → restore terms → cache in Redis → return
 */
export async function translateText(
  text: string,
  sourceLocale: string,
  targetLocale: string,
): Promise<string> {
  if (!text.trim()) return text

  const sourceHash = hashText(text)
  const redisKey = `tm:${sourceHash}:${sourceLocale}:${targetLocale}`

  // 1. Check Redis translation memory
  const storage = useStorage('redis')
  let raw: string | null = null
  try {
    raw = await storage.getItem<string>(redisKey)
  } catch {
    // Redis unavailable — treat as cache miss
  }

  if (raw) {
    try {
      const cached = JSON.parse(raw) as { translatedText: string }
      if (cached.translatedText) {
        return cached.translatedText
      }
    } catch {
      // Corrupted cache entry — treat as cache miss
    }
  }

  // 2. Protect glossary terms before sending to Gemini
  const { protectedText, placeholders } = protectTerms(text)

  // 3. Call Gemini via AI SDK
  const translated = await callGemini(protectedText, sourceLocale, targetLocale)

  // 4. Restore glossary terms
  const finalText = restoreTerms(translated, placeholders)

  storage.setItem(redisKey, JSON.stringify({
    translatedText: finalText,
    sourceText: text,
    provider: 'gemini',
  }), { ttl: 90 * 24 * 60 * 60 }).catch(() => {
    // Ignore cache write errors
  })

  return finalText
}

/** SHA-256 hash of source text for cache lookups */
function hashText(text: string): string {
  const normalized = text.trim().replace(/\s+/g, ' ')
  return createHash('sha256').update(normalized).digest('hex')
}

/** Translate text via Gemini Flash using AI SDK */
async function callGemini(
  text: string,
  sourceLocale: string,
  targetLocale: string,
): Promise<string> {
  const config = useRuntimeConfig(event)
  const apiKey = config.geminiApiKey as string | undefined

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in runtime config')
  }

  const google = createGoogleGenerativeAI({ apiKey })
  const sourceLang = normalizeLocale(sourceLocale)
  const targetLang = normalizeLocale(targetLocale)

  try {
    const { text: translated } = await generateText({
      model: google('gemini-2.5-flash'),
      system: `You are a professional translator for a venue directory. Translate the following text from ${sourceLang} to ${targetLang}. Preserve all formatting, markdown syntax, and placeholder tokens (§§...§§) exactly as they appear. Output ONLY the translated text, nothing else.`,
      prompt: text,
      maxTokens: 2048,
    })

    if (!translated || !translated.trim()) {
      throw new Error('Gemini returned empty translation')
    }
    
    return translated.trim()
  } catch (error) {
    console.error('[deepl] Gemini translation failed:', error)
    throw error
  }
}

/** Invalidate a cached translation in Redis TM */
export async function invalidateTMCache(
  sourceText: string,
  sourceLocale: string,
  targetLocale: string,
): Promise<void> {
  const sourceHash = hashText(sourceText)
  const redisKey = `tm:${sourceHash}:${sourceLocale}:${targetLocale}`
  try {
    await useStorage('redis').removeItem(redisKey)
  } catch {
    // Redis unavailable — nothing to invalidate
  }
}

/** Normalize locale codes (fr → French, en → English, etc.) */
const LOCALE_NAMES: Record<string, string> = {
  fr: 'French',
  en: 'English',
  de: 'German',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
}

function normalizeLocale(locale: string): string {
  const code = locale.split('-')[0]!
  return LOCALE_NAMES[code] ?? code.toUpperCase()
}
