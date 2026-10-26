import { defineEventHandler, getRequestURL, sendRedirect } from "h3";
import { resolveCategoryRedirectPath } from "~~/shared/activities";

const OLD_SLUG_PATTERN = /^(.+)-(\d{1,3})$/;
const LOCALES = new Set(["fr", "en", "de", "es", "it", "pt"]);
const STYLE_PATH_RE =
  /^\/(?:([a-z]{2})\/)?categories\/([^/]+)(?:\/([^/]+))?\/?$/;

export default defineEventHandler((event) => {
  const pathname = getRequestURL(event).pathname;
  const match = pathname.match(STYLE_PATH_RE);
  if (!match) return;

  const localeCode = match[1] ?? "fr";
  if (!LOCALES.has(localeCode)) return;

  const rawCategorySlug = decodeURIComponent(match[2]!);
  const citySlug = match[3] ? decodeURIComponent(match[3]) : undefined;
  const localePrefix = localeCode === "fr" ? "" : `/${localeCode}`;
  const cityPart = citySlug ? `/${citySlug}` : "";

  const oldSlugMatch = rawCategorySlug.match(OLD_SLUG_PATTERN);
  if (oldSlugMatch) {
    const numericSuffix = Number.parseInt(oldSlugMatch[2]!, 10);
    if (numericSuffix > 0 && numericSuffix <= 100) {
      const strippedSlug = oldSlugMatch[1]!;
      const aliasRedirect = resolveCategoryRedirectPath(
        localeCode,
        strippedSlug,
        citySlug,
      );
      const target =
        aliasRedirect ??
        `${localePrefix}/categories/${strippedSlug}${cityPart}`;
      return sendRedirect(event, target, 301);
    }
  }

  const redirectPath = resolveCategoryRedirectPath(
    localeCode,
    rawCategorySlug,
    citySlug,
  );
  if (redirectPath) {
    return sendRedirect(event, redirectPath, 301);
  }
});
