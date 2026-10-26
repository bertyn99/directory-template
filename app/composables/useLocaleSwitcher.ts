import type { Locale } from "vue-i18n";
import { buildCategoryPath, findActivityDefinition } from "~~/shared/activities";

const SUPPORTED_LOCALES = ["fr", "en", "de", "es", "it", "pt"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export function isAppLocale(value: string): value is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Switch locale while preserving translated dynamic route params
 * (e.g. /categories/boxe-thai → /de/categories/thai-boxen via useSetI18nParams).
 * @see https://i18n.nuxtjs.org/docs/composables/use-set-i18n-params
 */
export function useLocaleSwitcher() {
  const switchLocalePath = useSwitchLocalePath();
  const route = useRoute();

  function resolveCategoryLocalePath(code: AppLocale): string | null {
    const categoriesParam = route.params.category;
    if (typeof categoriesParam !== "string") return null;

    const def = findActivityDefinition(decodeURIComponent(categoriesParam));
    if (!def) return null;

    const cityParam = route.params.cities;
    const citySlug =
      typeof cityParam === "string"
        ? decodeURIComponent(cityParam)
        : undefined;

    return buildCategoryPath(code, def.slug, citySlug);
  }

  async function switchToLocale(code: string) {
    if (!isAppLocale(code)) return;

    const categoryPath = resolveCategoryLocalePath(code);
    const targetPath = categoryPath ?? switchLocalePath(code as Locale);

    if (targetPath && targetPath !== route.fullPath) {
      await navigateTo(targetPath);
      return;
    }

    const { setLocale } = useI18n();
    await setLocale(code);
  }

  return { switchToLocale, switchLocalePath };
}
