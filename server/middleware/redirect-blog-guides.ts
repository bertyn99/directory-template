import { defineEventHandler, getRequestURL, sendRedirect } from "h3";
import { buildCategoryPath } from "~~/shared/activities";
import { isContentLocale, resolveBlogGuideRedirect } from "~~/shared/silo";

const BLOG_PATH_RE = /^\/(?:([a-z]{2})\/)?blog\/([^/]+)\/?$/;

export default defineEventHandler((event) => {
  const pathname = getRequestURL(event).pathname;
  const match = pathname.match(BLOG_PATH_RE);
  if (!match) return;

  const locale = match[1] ?? "fr";
  if (!isContentLocale(locale)) return;

  let slug: string;
  try {
    slug = decodeURIComponent(match[2]!);
  } catch {
    return;
  }

  const entry = resolveBlogGuideRedirect(locale, slug);
  if (!entry) return;

  if (entry.target.kind === "venues-guide") {
    const loc = locale === "fr" ? "/venues/guide" : `/${locale}/venues/guide`;
    return sendRedirect(event, loc, 301);
  }

  if (entry.target.kind === "category") {
    return sendRedirect(
      event,
      `${buildCategoryPath(locale, entry.target.category)}/${entry.target.type}`,
      301,
    );
  }

  const unreachable: never = entry.target;
  return unreachable;
});
