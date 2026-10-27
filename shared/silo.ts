import { findActivityDefinition } from './activities'
import { directoryConfig } from '../directory.config'

/**
 * Active locales — directoryConfig.locales is the ONLY locale list the app
 * routes, renders and builds content collections for. Every derived locale
 * set (content collections, switcher, hreflang) narrows to this.
 */
export const CONTENT_LOCALES = directoryConfig.locales
export type ContentLocale = (typeof CONTENT_LOCALES)[number]

/**
 * Silo spoke vocabulary — driven by directoryConfig.content.siloSpokes
 * (per-niche URL segments reserved under /categories/<category>/<spoke>;
 * labels live in the i18n keys `guide.types.<slug>`).
 */
export const SILO_SPOKE_TYPES = directoryConfig.content.siloSpokes

export type SiloSpokeType = (typeof SILO_SPOKE_TYPES)[number]

export const SILO_ENTRY_TYPES = [...SILO_SPOKE_TYPES, 'hub'] as const
export type SiloEntryType = (typeof SILO_ENTRY_TYPES)[number]

/** @deprecated Use SILO_SPOKE_TYPES — kept as an alias for spoke routes. */
export const SILO_PAGE_TYPES = SILO_SPOKE_TYPES
export type SiloPageType = SiloSpokeType

export const RESERVED_SUBTOPIC_SLUGS = new Set<string>(SILO_ENTRY_TYPES)

const SILO_TYPE_ORDER = new Map(SILO_SPOKE_TYPES.map((type, index) => [type, index]))

export function isContentLocale(value: string): value is ContentLocale {
  return (CONTENT_LOCALES as readonly string[]).includes(value)
}

export function resolveContentLocale(locale: string): ContentLocale {
  return isContentLocale(locale) ? locale : directoryConfig.defaultLocale
}

/**
 * Content collection holding the category guides for an ACTIVE locale.
 * Takes an already-narrowed ContentLocale (use resolveContentLocale for raw
 * input) so the returned name can never reference a collection that
 * content.config.ts did not create — collections are derived from the same
 * directoryConfig.locales set. Querying a non-created collection would 500.
 */
export function categoryGuidesCollectionName(locale: ContentLocale): `categoryGuides_${ContentLocale}` {
  return `categoryGuides_${locale}`
}

/**
 * Locales that ship the venue-index guide
 * (content/{locale}/category-guides/_directory/guide.md). Derived from the
 * active locales — the template ships the _directory guide for all of them;
 * drop a locale here if an instantiation skips it.
 */
export const DIRECTORY_GUIDE_LOCALES = directoryConfig.locales

export function hasDirectoryGuide(locale: string): boolean {
  return (DIRECTORY_GUIDE_LOCALES as readonly string[]).includes(locale)
}


export function isSiloSpokeType(type: string): type is SiloSpokeType {
  return (SILO_SPOKE_TYPES as readonly string[]).includes(type)
}

export function isSiloEntryType(type: string): type is SiloEntryType {
  return (SILO_ENTRY_TYPES as readonly string[]).includes(type)
}

export function siloTypeLabelKey(type: SiloSpokeType): `guide.types.${SiloSpokeType}` {
  return `guide.types.${type}`
}

export function sortSiloEntries<T extends { type: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    const left = isSiloSpokeType(a.type) ? (SILO_TYPE_ORDER.get(a.type) ?? 99) : 99
    const right = isSiloSpokeType(b.type) ? (SILO_TYPE_ORDER.get(b.type) ?? 99) : 99
    return left - right
  })
}

export function resolveCanonicalCategorySlug(categoryProp: string | undefined, routeParam: string): string {
  if (categoryProp) return categoryProp
  return findActivityDefinition(routeParam)?.slug ?? ''
}

/** First N words of markdown, stripped of markup — hub "C'est quoi" cap. */
export function excerptPlainText(markdown: string, maxWords: number): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const words = text.split(' ').filter(Boolean)
  if (words.length <= maxWords) return text
  return `${words.slice(0, maxWords).join(' ')}…`
}

export type SiloRedirectTarget =
  | { kind: 'category', category: string, type: SiloSpokeType }
  | { kind: 'venues-guide' }

export interface BlogGuideRedirect {
  translationKey: string
  target: SiloRedirectTarget
  slugs: Partial<Record<ContentLocale, string>>
}

/**
 * Single source of truth for blog → silo 301s, keyed by translationKey
 * (docs/seo/content-architecture.md §6.1). Locale slugs differ; the target does not.
 */
/**
 * Single source of truth for blog → silo 301s, keyed by translationKey
 * (docs/seo/content-architecture.md §6.1). Locale slugs differ; the target does not.
 *
 * Per-app legacy slugs live here — the template ships an EMPTY list.
 * Shape (illustrative sample):
 * {
 *   translationKey: 'guide-fitness',
 *   target: { kind: 'category', category: 'fitness', type: 'guide' },
 *   slugs: { fr: 'guide-fitness', en: 'fitness-beginner-guide' },
 * },
 */
export const BLOG_GUIDE_REDIRECTS: BlogGuideRedirect[] = [
]

const REDIRECT_BY_LOCALE_SLUG = new Map<string, BlogGuideRedirect>()
for (const entry of BLOG_GUIDE_REDIRECTS) {
  for (const [locale, slug] of Object.entries(entry.slugs)) {
    REDIRECT_BY_LOCALE_SLUG.set(`${locale}:${slug}`, entry)
  }
}

export function resolveBlogGuideRedirect(
  locale: string,
  slug: string,
): BlogGuideRedirect | undefined {
  return REDIRECT_BY_LOCALE_SLUG.get(`${locale}:${slug}`)
}
