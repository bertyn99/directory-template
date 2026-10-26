import { describe, expect, it } from "vitest";
import {
  ACTIVITY_ALIAS_ONLY_SLUGS,
  activityMatchesSearch,
  buildCategoryPath,
  findActivityDefinition,
  getActivityDisplayName,
  getActivityDisplayNameForRow,
  getCategoryI18nParams,
  pickCanonicalRows,
  resolveActivityAlias,
  resolveCategoryRedirectPath,
} from "~~/shared/activities";

describe("activity catalog (slug identity)", () => {
  it("uses English as the canonical base name", () => {
    expect(getActivityDisplayName("fitness", "en")).toBe("Fitness");
    expect(getActivityDisplayName("yoga", "en")).toBe("Yoga");
    expect(getActivityDisplayName("spa", "en")).toBe("Spa");
  });

  it("returns locale display names from the keyed map", () => {
    expect(getActivityDisplayName("fitness", "fr")).toBe("Fitness");
    expect(getActivityDisplayName("fitness", "de")).toBe("Fitness");
    expect(getActivityDisplayName("spa", "fr")).toBe("Spa");
    expect(getActivityDisplayName("yoga", "pt")).toBe("Yoga");
  });

  it("maps aliases to canonical English slugs like import", () => {
    expect(resolveActivityAlias("Gym")).toBe("fitness");
    expect(resolveActivityAlias("gym")).toBe("fitness");
    expect(resolveActivityAlias("hatha-yoga")).toBe("yoga");
    expect(resolveActivityAlias("vinyasa")).toBe("yoga");
    expect(resolveActivityAlias("wellness")).toBe("spa");
    expect(resolveActivityAlias("bien-etre")).toBe("spa");
  });

  it("resolves alias-only rows that use a non-canonical primary slug", () => {
    expect(findActivityDefinition("gym")?.slug).toBe("fitness");
    expect(findActivityDefinition("wellness")?.slug).toBe("spa");
    expect(
      getActivityDisplayNameForRow({ slug: "gym", name: "Gym" }, "en"),
    ).toBe("Fitness");
    expect(
      getActivityDisplayNameForRow({ slug: "wellness", name: "Wellness" }, "en"),
    ).toBe("Spa");
  });

  it("excludes alias-only slugs from the filter list set", () => {
    expect(ACTIVITY_ALIAS_ONLY_SLUGS.has("gym")).toBe(true);
    expect(ACTIVITY_ALIAS_ONLY_SLUGS.has("wellness")).toBe(true);
    expect(ACTIVITY_ALIAS_ONLY_SLUGS.has("fitness")).toBe(false);
  });

  it("matches search across locale names and aliases", () => {
    expect(activityMatchesSearch({ slug: "yoga", name: "Yoga" }, "yoga")).toBe(
      true,
    );
    expect(
      activityMatchesSearch({ slug: "gym", name: "Gym" }, "fitness"),
    ).toBe(true);
    expect(
      activityMatchesSearch({ slug: "wellness", name: "Wellness" }, "Spa"),
    ).toBe(true);
    expect(
      activityMatchesSearch({ slug: "yoga", name: "Yoga" }, "fitness"),
    ).toBe(false);
  });

  it("dedupes alias + canonical rows into one catalog entry", () => {
    // Sample-shaped: canonical "fitness" row plus an alias-only "gym" row
    const rows = [
      { id: 2, slug: "gym", name: "Gym" },
      { id: 1, slug: "fitness", name: "Fitness" },
    ];

    const picked = pickCanonicalRows(rows);
    const slugs = picked.map((r) => r.slug).sort();

    expect(slugs).toEqual(["fitness"]);
    expect(picked.find((r) => r.slug === "fitness")?.id).toBe(1);
  });

  it("keeps an alias-only row when it is the sole representative", () => {
    const rows = [{ id: 2, slug: "gym", name: "Gym" }];
    const picked = pickCanonicalRows(rows);
    expect(picked).toHaveLength(1);
    expect(picked[0]?.slug).toBe("gym");
  });

  it("prefers english canonical when both canonical and alias exist", () => {
    const rows = [
      { id: 1, slug: "fitness", name: "Fitness" },
      { id: 2, slug: "gym", name: "Gym" },
    ];
    const picked = pickCanonicalRows(rows);
    expect(picked).toHaveLength(1);
    expect(picked[0]?.slug).toBe("fitness");
  });

  it("builds locale-specific category paths from catalog", () => {
    expect(buildCategoryPath("fr", "yoga")).toBe("/categories/yoga");
    expect(buildCategoryPath("en", "yoga")).toBe("/en/categories/yoga");
    expect(buildCategoryPath("de", "spa")).toBe("/de/categories/spa");
    expect(buildCategoryPath("fr", "fitness", "paris")).toBe(
      "/categories/fitness/paris",
    );
  });

  it("redirects alias and non-canonical category slugs", () => {
    expect(resolveCategoryRedirectPath("en", "gym")).toBe(
      "/en/categories/fitness",
    );
    expect(resolveCategoryRedirectPath("fr", "fitness")).toBeNull();
    expect(resolveCategoryRedirectPath("en", "yoga")).toBeNull();
    expect(resolveCategoryRedirectPath("fr", "wellness")).toBe(
      "/categories/spa",
    );
    expect(
      resolveCategoryRedirectPath("de", "wellness", "berlin"),
    ).toBe("/de/categories/spa/berlin");
  });

  it("builds i18n route params per locale", () => {
    expect(getCategoryI18nParams("yoga")).toEqual({
      fr: { categories: "yoga" },
      en: { categories: "yoga" },
      de: { categories: "yoga" },
      es: { categories: "yoga" },
      it: { categories: "yoga" },
      pt: { categories: "yoga" },
    });
  });
});
