import type { ActivityDefinition } from "~~/shared/activities";
import {
  findActivityDefinition,
  getActivityLocaleSlug,
  getCategoryCityI18nParams,
  getCategoryI18nParams,
  resolveCategoryRedirectPath,
} from "~~/shared/activities";
import {
  CITY_URL_PATTERN,
  categoryCityPath,
  resolveChainRouteParams,
} from "~~/shared/city-chain";

/**
 * Per-locale i18n route params for the country-first chain route
 * ([country]/[city]/[category] — param names country/city/category, city and
 * country slugs identical across locales, category localized).
 */
function getCategoryChainI18nParams(
  canonicalSlug: string,
  citySlug: string,
  countrySlug: string,
): Record<string, { country: string; city: string; category: string }> {
  const params: Record<
    string,
    { country: string; city: string; category: string }
  > = {};
  for (const [loc, localized] of Object.entries(
    getCategoryI18nParams(canonicalSlug),
  )) {
    params[loc] = {
      country: countrySlug,
      city: citySlug,
      category: localized.categories,
    };
  }
  return params;
}

/**
 * Resolve catalog slug from the URL, 301-redirect alias/wrong-locale slugs,
 * and register per-locale route params for switchLocalePath.
 *
 * Serves two route shapes: the /categories dispatcher (params
 * category/cities) and the country-first chain ([country]/[city]/[category]).
 * shared/city-chain.ts resolveChainRouteParams normalizes both spellings; on
 * the chain route the alias redirect keeps the chain shape
 * (cityUrlPattern-aware) and the i18n params carry country/city/category.
 */
export async function useCategoryRouteI18n() {
  const route = useRoute();
  const { locale } = useI18n();
  const setI18nParams = useSetI18nParams();

  const normalized = resolveChainRouteParams(route.params);
  const incomingCategorySlug = normalized.categorySlug ?? "";
  const citySlugParam = normalized.citySlug;
  const countrySlugParam = normalized.countrySlug;

  const catalogDef = computed(() => findActivityDefinition(incomingCategorySlug));

  function applyI18nParams(def: ActivityDefinition) {
    if (countrySlugParam && citySlugParam) {
      setI18nParams(
        getCategoryChainI18nParams(def.slug, citySlugParam, countrySlugParam),
      );
      return;
    }
    setI18nParams(
      citySlugParam
        ? getCategoryCityI18nParams(def.slug, citySlugParam)
        : getCategoryI18nParams(def.slug),
    );
  }

  const redirectPath = resolveCategoryRedirectPath(
    locale.value,
    incomingCategorySlug,
    citySlugParam,
  );
  if (redirectPath && redirectPath !== route.path) {
    // resolveCategoryRedirectPath always rebuilds the /categories shape. On
    // the country-first chain the corrected category slug must STAY in the
    // chain shape — rewrite the target instead of bouncing through the
    // legacy URL (which would 301 once more through the dispatcher).
    const target =
      CITY_URL_PATTERN === "country-city-category" &&
      countrySlugParam &&
      citySlugParam &&
      catalogDef.value
        ? categoryCityPath(
            "country-city-category",
            getActivityLocaleSlug(catalogDef.value.slug, locale.value) ??
              catalogDef.value.slug,
            countrySlugParam,
            citySlugParam,
          )
        : redirectPath;
    if (target !== route.path) {
      await navigateTo(target, { redirectCode: 301, replace: true });
    }
  }

  const def = catalogDef.value;
  if (def) {
    applyI18nParams(def);
  }

  watchEffect(() => {
    const currentDef = catalogDef.value;
    if (!currentDef) return;
    applyI18nParams(currentDef);
  });

  return { catalogDef, incomingCategorySlug };
}
