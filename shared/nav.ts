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

/**
 * Pillar-article links — directoryConfig.content.pillarPaths is the SINGLE
 * SOURCE (per-locale path of the pillar article). A locale without a
 * configured path yields `undefined`: consumers MUST hide the link then
 * (no cross-locale fallback — a fr page never links to the en article).
 */
export function pillarPath(locale: string): string | undefined {
  if (!isContentLocale(locale)) return undefined;
  return directoryConfig.content.pillarPaths[locale];
}
