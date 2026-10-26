import {
  findActivityDefinition,
  getCategoryCityI18nParams,
  getCategoryI18nParams,
  resolveCategoryRedirectPath,
} from "~~/shared/activities";

/**
 * Resolve catalog slug from the URL, 301-redirect alias/wrong-locale slugs,
 * and register per-locale route params for switchLocalePath.
 */
export async function useCategoryRouteI18n() {
  const route = useRoute();
  const { locale } = useI18n();
  const setI18nParams = useSetI18nParams();

  const incomingCategorySlug = decodeURIComponent(String(route.params.category ?? ""));
  const citySlugParam =
    typeof route.params.cities === "string"
      ? decodeURIComponent(route.params.cities)
      : undefined;

  const catalogDef = computed(() => findActivityDefinition(incomingCategorySlug));

  const redirectPath = resolveCategoryRedirectPath(
    locale.value,
    incomingCategorySlug,
    citySlugParam,
  );
  if (redirectPath && redirectPath !== route.path) {
    await navigateTo(redirectPath, { redirectCode: 301, replace: true });
  }

  const def = catalogDef.value;
  if (def) {
    setI18nParams(
      citySlugParam
        ? getCategoryCityI18nParams(def.slug, citySlugParam)
        : getCategoryI18nParams(def.slug),
    );
  }

  watchEffect(() => {
    const currentDef = catalogDef.value;
    if (!currentDef) return;
    if (citySlugParam) {
      setI18nParams(getCategoryCityI18nParams(currentDef.slug, citySlugParam));
    } else {
      setI18nParams(getCategoryI18nParams(currentDef.slug));
    }
  });

  return { catalogDef, incomingCategorySlug };
}
