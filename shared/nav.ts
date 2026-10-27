import { directoryConfig } from '../directory.config'
import { SHIPPED_LOCALES } from './locale-meta'
import { isContentLocale, type ContentLocale } from './silo'

export interface LocaleMenuItem {
  label: string
  icon: string
  code: ContentLocale
}

/**
 * Locale switcher entries — ACTIVE locales only (directoryConfig.locales
 * ∩ SHIPPED_LOCALES, in config display order). Inactive locales keep their
 * translation files but are never offered for navigation.
 */
export const LOCALE_MENU_ITEMS: LocaleMenuItem[] = directoryConfig.locales
  .filter(code => code in SHIPPED_LOCALES)
  .map(code => ({
    label: code.toUpperCase(),
    icon: SHIPPED_LOCALES[code].flag,
    code,
  }))

const COMPARATIF_EN = '/blog/niche-directory-vs-marketplace'

/**
 * Per-locale path of the comparatif pillar article. Active locales without a
 * translated entry fall back to the English article (inactive-locale visitors
 * never hit this — the switcher only offers active locales).
 */
export const COMPARATIF_PATHS: Partial<Record<ContentLocale, string>> = {
  fr: '/blog/annuaire-niche-vs-marketplace',
  en: COMPARATIF_EN,
}

export function comparatifPath(locale: string): string {
  return (isContentLocale(locale) ? COMPARATIF_PATHS[locale] : undefined) ?? COMPARATIF_EN
}
