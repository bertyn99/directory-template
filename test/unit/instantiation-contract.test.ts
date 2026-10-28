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
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { directoryConfig, type ConfigLocale } from "~~/directory.config";
import {
  compareLocaleTree,
  findPlaceholderMismatches,
  flattenLocaleTree,
  localeLeafMap,
  missingRequiredKeys,
} from "~~/shared/locale-parity";
import { SHIPPED_LOCALES } from "~~/shared/locale-meta";
import { majorEuCityImageSlug } from "~~/shared/major-eu-cities";
import { SCRAPING_SOURCE_IDS } from "~~/server/services/scraping/sources/ids";

const rootDir = fileURLToPath(new URL("../..", import.meta.url));
const fromRoot = (path: string) => `${rootDir}${path}`;

/**
 * Two-tier locale parity (see i18n/README.md):
 *
 * - Tier 1 — VERIFIED_LOCALES (+ fr, the reference): full key-tree parity
 *   with fr.json, enforced in BOTH directions (extra keys fail too — they
 *   mean the translation lags behind fr).
 * - Tier 2 — every other ACTIVE locale (drafts): placeholder parity on the
 *   keys they do have, plus the minimal launch families (nav, home hero,
 *   footer, legal disclosure, billing chrome, guide.types.* labels…).
 *
 * Rationale: activating a draft locale today passes the "file exists" check
 * while missing keys silently fall back to French at runtime. Tier 2 makes
 * the minimum shippable surface explicit; raise a locale into
 * VERIFIED_LOCALES once its translation reaches full parity (run
 * `pnpm instantiate:locale <code>` for the parity report).
 */
export const VERIFIED_LOCALES: readonly ConfigLocale[] = ["en"];

/** The reference key tree — code depends on fr keys existing everywhere. */
const REFERENCE_LOCALE: ConfigLocale = "fr";

function loadLocaleJson(code: string): unknown {
  return JSON.parse(
    readFileSync(fromRoot(`i18n/locales/${code}.json`), "utf8"),
  ) as unknown;
}

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

  it("enforces full key-tree parity with fr for verified locales (tier 1)", () => {
    const frKeys = flattenLocaleTree(loadLocaleJson(REFERENCE_LOCALE)).sort();
    for (const code of VERIFIED_LOCALES) {
      if (code === REFERENCE_LOCALE) continue;
      const localeKeys = flattenLocaleTree(loadLocaleJson(code)).sort();
      const { missingInLocale, extraInLocale } = compareLocaleTree(
        frKeys,
        localeKeys,
      );
      expect(
        missingInLocale,
        `${code}.json is missing keys that exist in fr.json (missing keys silently fall back to French at runtime)`,
      ).toEqual([]);
      expect(
        extraInLocale,
        `${code}.json has keys that fr.json does not have — the translation lags behind the fr reference (delete the dead keys or add the fr originals)`,
      ).toEqual([]);
    }
  });

  it("enforces the launch-critical key families in every active locale", () => {
    for (const code of directoryConfig.locales) {
      const missing = missingRequiredKeys(
        flattenLocaleTree(loadLocaleJson(code)),
        directoryConfig.content.siloSpokes,
        directoryConfig.taxonomy.facets.map((facet) => facet.key),
      );
      expect(
        missing,
        `${code}.json is missing launch-critical keys: ${missing.join(", ")}. Translate these families in i18n/locales/${code}.json (missing keys silently fall back to French) — run \`pnpm instantiate:locale ${code}\` for the full parity report`,
      ).toEqual([]);
    }
  });

  it("keeps interpolation placeholders aligned with fr in draft locales (tier 2)", () => {
    const frLeaves = localeLeafMap(loadLocaleJson(REFERENCE_LOCALE));
    const draftLocales = directoryConfig.locales.filter(
      (code) => code !== REFERENCE_LOCALE && !VERIFIED_LOCALES.includes(code),
    );
    for (const code of draftLocales) {
      const mismatches = findPlaceholderMismatches(
        frLeaves,
        localeLeafMap(loadLocaleJson(code)),
      );
      const summary = mismatches
        .slice(0, 10)
        .map(
          ({ key, fr, locale }) =>
            `${key} (fr {${fr.join(", ")}} vs ${code} {${locale.join(", ")}})`,
        )
        .join("; ");
      expect(
        mismatches,
        `${code}.json interpolation placeholders diverge from fr.json (${mismatches.length} keys): ${summary}. A renamed or missing {placeholder} renders its raw name at runtime`,
      ).toEqual([]);
    }
  });

  it("ships the footer guide and at least one blog article for every active locale", () => {
    for (const code of directoryConfig.locales) {
      // Footer.vue links /<locale>/venues/guide for every locale in
      // DIRECTORY_GUIDE_LOCALES (= directoryConfig.locales); a missing file
      // is a guaranteed 404 on that footer link.
      const directoryGuide = fromRoot(
        `content/${code}/category-guides/_directory/guide.md`,
      );
      expect(
        existsSync(directoryGuide),
        `content/${code}/category-guides/_directory/guide.md is missing — the footer links /${code === directoryConfig.defaultLocale ? "" : `/${code}`}/venues/guide for every active locale, so this is a 404. Run \`pnpm instantiate:locale ${code}\` to stub it, then translate`,
      ).toBe(true);
      const blogDir = fromRoot(`content/${code}/blog`);
      expect(existsSync(blogDir), `missing content/${code}/blog/ directory`).toBe(
        true,
      );
      const hasBlogArticle = readdirSync(blogDir).some((name) =>
        name.endsWith(".md"),
      );
      expect(
        hasBlogArticle,
        `content/${code}/blog/ has no article — the /${code === directoryConfig.defaultLocale ? "" : `/${code}`}/blog route renders empty and its pillar CTA has no target. Run \`pnpm instantiate:locale ${code}\` to stub one, then translate`,
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

  it("ships a city banner image for every seedCity (/img/cities/<slug>.jpg)", () => {
    expect(directoryConfig.scraping.seedCities.length).toBeGreaterThan(0);
    for (const name of directoryConfig.scraping.seedCities) {
      // Same slugification as the banner consumers (shared/major-eu-cities.ts,
      // incl. alias canonicalization e.g. Lisboa → lisbon).
      const slug = majorEuCityImageSlug(name);
      expect(
        existsSync(fromRoot(`public/img/cities/${slug}.jpg`)),
        `seedCity "${name}" has no banner at public/img/cities/${slug}.jpg (CityPage cards would fall back to the generic placeholder)`,
      ).toBe(true);
    }
  });
});

describe("instantiation contract — content", () => {
  it("keys pillarPaths only by active locales", () => {
    for (const locale of Object.keys(directoryConfig.content.pillarPaths)) {
      expect(
        directoryConfig.locales,
        `content.pillarPaths keys inactive locale "${locale}" — the link renders only in active locales`,
      ).toContain(locale as (typeof directoryConfig.locales)[number]);
    }
    for (const path of Object.values(directoryConfig.content.pillarPaths)) {
      expect(path.startsWith("/"), `pillar path "${path}" must be origin-relative`).toBe(true);
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

describe("instantiation contract — facets", () => {
  const facets = directoryConfig.taxonomy.facets;
  const keys = facets.map((facet) => facet.key);

  it("keeps facet keys unique (they are the venues.attributes JSONB keys)", () => {
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every enum facet at least one value, without duplicates", () => {
    for (const facet of facets) {
      if (facet.kind !== "enum") continue;
      expect(
        facet.values?.length,
        `enum facet "${facet.key}" has no values — enum facets require a non-empty whitelist (filtering AND rendering)`,
      ).toBeGreaterThan(0);
      expect(
        new Set(facet.values).size,
        `enum facet "${facet.key}" has duplicate values`,
      ).toBe(facet.values!.length);
    }
  });

  it("ships i18n labels for every facet + enum value in every active locale", () => {
    for (const code of directoryConfig.locales) {
      const localeKeySet = new Set(flattenLocaleTree(loadLocaleJson(code)));
      for (const facet of facets) {
        const labelKey =
          facet.kind === "enum" ? `facet.${facet.key}.label` : `facet.${facet.key}`;
        expect(
          localeKeySet.has(labelKey),
          `${code}.json is missing "${labelKey}" (facet chips + filter controls render through it)`,
        ).toBe(true);
        for (const value of facet.values ?? []) {
          expect(
            localeKeySet.has(`facet.${facet.key}.${value}`),
            `${code}.json is missing "facet.${facet.key}.${value}" (enum chips render through it)`,
          ).toBe(true);
        }
      }
    }
  });
});

describe("instantiation contract — billing", () => {
  it("uses an ISO 4217 currency code", () => {
    expect(directoryConfig.billing.currency).toMatch(/^[A-Z]{3}$/);
  });

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

describe("instantiation contract — booking", () => {
  it("keeps booking partner ids unique", () => {
    const ids = directoryConfig.booking.partners.map((partner) => partner.id);
    // The id is stored in venues.booking_partner and resolved by exact match
    // first — a duplicate would silently bind venues to the wrong partner.
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every booking partner at least one host and a non-empty fr label", () => {
    for (const partner of directoryConfig.booking.partners) {
      expect(
        partner.hosts.length,
        `booking partner "${partner.id}" has no hosts — it could never match a booking_url by host suffix`,
      ).toBeGreaterThan(0);
      for (const host of partner.hosts) {
        expect(host.trim().length, `booking partner "${partner.id}" has an empty host entry`).toBeGreaterThan(0);
      }
      expect(
        partner.label.fr.trim().length,
        `booking partner "${partner.id}" needs a non-empty fr label (the CTA label fallback)`,
      ).toBeGreaterThan(0);
    }
  });

  it("declares sponsored explicitly as a boolean on every booking partner", () => {
    for (const partner of directoryConfig.booking.partners) {
      expect(
        typeof partner.sponsored,
        `booking partner "${partner.id}": sponsored must be a boolean (true ⇒ rel="sponsored…" + disclosure)`,
      ).toBe("boolean");
    }
  });
});
