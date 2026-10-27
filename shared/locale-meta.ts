/**
 * Locale metadata for every translation file shipped in i18n/locales/.
 *
 * Single source of truth for locale display data (BCP-47 language tag,
 * display name, flag icon) — consumed by nuxt.config.ts (i18n.locales),
 * shared/nav.ts (locale switcher) and the hreflang builders
 * (shared/activities.ts, server/api/__sitemap__/urls/).
 *
 * Activation is decided by directoryConfig.locales — inactive codes keep
 * their translation files on disk but are not routed, not in hreflang,
 * not in the sitemap, and not offered by the locale switcher.
 */
export const SHIPPED_LOCALES = {
  fr: { language: 'fr-FR', name: 'Français', flag: 'i-flag:fr-4x3' },
  en: { language: 'en-US', name: 'English', flag: 'i-flag:us-4x3' },
  de: { language: 'de-DE', name: 'Deutsch', flag: 'i-flag:de-4x3' },
  es: { language: 'es-ES', name: 'Español', flag: 'i-flag:es-4x3' },
  it: { language: 'it-IT', name: 'Italiano', flag: 'i-flag:it-4x3' },
  pt: { language: 'pt-PT', name: 'Português', flag: 'i-flag:pt-4x3' },
} as const

export type ShippedLocale = keyof typeof SHIPPED_LOCALES

/** BCP-47 language tag of a shipped locale — undefined for non-shipped codes. */
export function hreflangOf(locale: string): string | undefined {
  return SHIPPED_LOCALES[locale as ShippedLocale]?.language
}
