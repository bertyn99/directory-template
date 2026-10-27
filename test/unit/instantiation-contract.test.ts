/**
 * Instantiation contract — config-internal coherence, checked in the
 * pure-Node unit lane so a broken directory.config.ts fails fast in
 * `pnpm test:unit` instead of surfacing at runtime (broken routes, dead
 * hubs, untracked affiliate clicks…).
 *
 * Deliberately NOT imported here: server/services/scraping/sources/registry.ts
 * drags Playwright in transitively (adapter parsers → ../browser.ts). The
 * scraping assertion therefore runs against the dependency-free id list in
 * sources/ids.ts; registry.ts itself asserts at boot that ids.ts mirrors its
 * registered adapters, so the chain config → ids.ts → adapters cannot drift.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { directoryConfig } from "~~/directory.config";
import { SHIPPED_LOCALES } from "~~/shared/locale-meta";
import { SCRAPING_SOURCE_IDS } from "~~/server/services/scraping/sources/ids";

const rootDir = fileURLToPath(new URL("../..", import.meta.url));
const fromRoot = (path: string) => `${rootDir}${path}`;

describe("instantiation contract — locales", () => {
  it("keeps fr active (the default locale must stay in the list)", () => {
    expect(directoryConfig.locales).toContain("fr");
    expect(directoryConfig.locales).toContain(directoryConfig.defaultLocale);
  });

  it("ships locale metadata, translation file and content dir for every active locale", () => {
    expect(directoryConfig.locales.length).toBeGreaterThan(0);
    for (const code of directoryConfig.locales) {
      expect(SHIPPED_LOCALES, `SHIPPED_LOCALES is missing "${code}"`).toHaveProperty(code);
      expect(
        existsSync(fromRoot(`i18n/locales/${code}.json`)),
        `missing i18n/locales/${code}.json`,
      ).toBe(true);
      expect(
        existsSync(fromRoot(`content/${code}`)),
        `missing content/${code}/ directory`,
      ).toBe(true);
    }
  });

  it("ships a non-empty affiliate.disclosure legal string in every active locale", () => {
    for (const code of directoryConfig.locales) {
      const translations = JSON.parse(
        readFileSync(fromRoot(`i18n/locales/${code}.json`), "utf8"),
      ) as { affiliate?: { disclosure?: unknown } };
      const disclosure = translations.affiliate?.disclosure;
      expect(
        typeof disclosure === "string" && disclosure.length > 0,
        `${code}.json affiliate.disclosure must be a non-empty string (mandatory legal copy next to every affiliate block)`,
      ).toBe(true);
    }
  });
});

describe("instantiation contract — scraping", () => {
  it("activates only registered adapters, without duplicates", () => {
    expect(new Set(directoryConfig.scraping.sources).size).toBe(
      directoryConfig.scraping.sources.length,
    );
    for (const id of directoryConfig.scraping.sources) {
      expect(
        SCRAPING_SOURCE_IDS as readonly string[],
        `directoryConfig.scraping.sources activates unknown adapter "${id}"`,
      ).toContain(id);
    }
  });
});

describe("instantiation contract — taxonomy", () => {
  const slugs = directoryConfig.taxonomy.categories.map((category) => category.slug);

  it("keeps category slugs unique", () => {
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("resolves every alias value to a category slug or another alias key", () => {
    for (const [alias, target] of Object.entries(directoryConfig.taxonomy.aliases)) {
      expect(
        slugs.includes(target) || target in directoryConfig.taxonomy.aliases,
        `alias "${alias}" → "${target}" is neither a category slug nor another alias key`,
      ).toBe(true);
    }
  });

  it("keeps alias-only slugs inside the alias table", () => {
    for (const slug of directoryConfig.taxonomy.aliasOnlySlugs) {
      expect(
        directoryConfig.taxonomy.aliases,
        `"${slug}" is alias-only but has no taxonomy.aliases entry`,
      ).toHaveProperty(slug);
    }
  });

  it("references known slugs from families and mostSearched", () => {
    for (const family of directoryConfig.taxonomy.families) {
      for (const slug of family.categories) {
        expect(slugs, `family "${family.id}" references unknown slug "${slug}"`).toContain(slug);
      }
    }
    for (const slug of directoryConfig.taxonomy.mostSearched) {
      expect(slugs, `mostSearched references unknown slug "${slug}"`).toContain(slug);
    }
  });

  it("keys seedIds by known slugs", () => {
    for (const slug of Object.keys(directoryConfig.taxonomy.seedIds)) {
      expect(slugs, `seedIds key "${slug}" is not a category slug`).toContain(slug);
    }
  });

  it("keeps silo spokes non-empty, unique and disjoint from category slugs", () => {
    expect(directoryConfig.content.siloSpokes.length).toBeGreaterThan(0);
    expect(new Set(directoryConfig.content.siloSpokes).size).toBe(
      directoryConfig.content.siloSpokes.length,
    );
    const collision = directoryConfig.content.siloSpokes.filter((spoke) => slugs.includes(spoke));
    expect(
      collision,
      `silo spokes colliding with category slugs: ${collision.join(", ")}`,
    ).toEqual([]);
  });
});

describe("instantiation contract — billing", () => {
  it("keeps the free tier out of the paid plans", () => {
    const ids = directoryConfig.billing.plans.map((plan) => plan.id);
    expect(ids, "billing.freePlanId must not appear in billing.plans").not.toContain(
      directoryConfig.billing.freePlanId,
    );
    expect(new Set(ids).size, "billing plan ids must be unique").toBe(ids.length);
  });

  it("uses lowercase-slug plan ids (Stripe lookup-key fragments)", () => {
    const ids = [...directoryConfig.billing.plans.map((plan) => plan.id), directoryConfig.billing.freePlanId];
    for (const id of ids) {
      // Checkout composes Stripe price lookup keys `${id}_monthly` /
      // `${id}_yearly`, so the id must stay a lowercase slug. Underscore is
      // tolerated only as a deliberate legacy exception (the sample ships
      // `premium_pro`, the id already created in Stripe by the origin app).
      expect(id, `plan id "${id}" must match /^[a-z0-9_-]+$/`).toMatch(/^[a-z0-9_-]+$/);
    }
  });
});
