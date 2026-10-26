import { isContentLocale, type ContentLocale } from './silo'

export interface LocaleMenuItem {
  label: string
  icon: string
  code: ContentLocale
}

export const LOCALE_MENU_ITEMS: LocaleMenuItem[] = [
  { label: 'FR', icon: 'i-flag:fr-4x3', code: 'fr' },
  { label: 'EN', icon: 'i-flag:us-4x3', code: 'en' },
  { label: 'DE', icon: 'i-flag:de-4x3', code: 'de' },
  { label: 'ES', icon: 'i-flag:es-4x3', code: 'es' },
  { label: 'IT', icon: 'i-flag:it-4x3', code: 'it' },
  { label: 'PT', icon: 'i-flag:pt-4x3', code: 'pt' },
]

export const COMPARATIF_PATHS: Record<ContentLocale, string> = {
  fr: '/blog/annuaire-niche-vs-marketplace',
  // de/es/it/pt have no translated placeholder yet — fall back to the English article
  de: '/blog/niche-directory-vs-marketplace',
  en: '/blog/niche-directory-vs-marketplace',
  es: '/blog/niche-directory-vs-marketplace',
  it: '/blog/niche-directory-vs-marketplace',
  pt: '/blog/niche-directory-vs-marketplace',
}

export function comparatifPath(locale: string): string {
  return isContentLocale(locale) ? COMPARATIF_PATHS[locale] : COMPARATIF_PATHS.fr
}
