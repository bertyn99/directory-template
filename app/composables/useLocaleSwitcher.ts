import type { Locale } from "vue-i18n";
import { directoryConfig } from "~~/directory.config";

/**
 * Active locales only — the switcher never offers a locale the app does not
 * route (single source: directoryConfig.locales, same as CONTENT_LOCALES).
 */
const SUPPORTED_LOCALES = directoryConfig.locales;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export function isAppLocale(value: string): value is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Switch locale, preserving the CURRENT surface (category × city chain,
 * spoke, venue…) through the per-locale route params registered by
 * useCategoryRouteI18n / useSetI18nParams on those pages. Country/city slugs
 * are identical across locales, the category slug is localized:
 * /france/paris/spa → /en/france/paris/<localized-slug>.
 * @see https://i18n.nuxtjs.org/docs/composables/use-set-i18n-params
 */
export function useLocaleSwitcher() {
  const switchLocalePath = useSwitchLocalePath();
  const route = useRoute();

  async function switchToLocale(code: string) {
    if (!isAppLocale(code)) return;

    const targetPath = switchLocalePath(code as Locale);

    if (targetPath && targetPath !== route.fullPath) {
      await navigateTo(targetPath);
      return;
    }

    const { setLocale } = useI18n();
    await setLocale(code);
  }

  return { switchToLocale, switchLocalePath };
}
