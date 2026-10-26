import { resolveCategoryRedirectPath } from "~~/shared/activities";

export default defineNuxtRouteMiddleware((to) => {
  const categoriesParam = to.params.categories;
  if (!categoriesParam || Array.isArray(categoriesParam)) return;

  const localeCode = useNuxtApp().$i18n.locale.value;
  const cityParam = to.params.cities;
  const citySlug =
    typeof cityParam === "string"
      ? cityParam
      : Array.isArray(cityParam)
        ? cityParam[0]
        : undefined;

  const redirectPath = resolveCategoryRedirectPath(
    localeCode,
    decodeURIComponent(categoriesParam),
    citySlug ? decodeURIComponent(citySlug) : undefined,
  );

  if (redirectPath && redirectPath !== to.path) {
    return navigateTo(redirectPath, { redirectCode: 301, replace: true });
  }
});
