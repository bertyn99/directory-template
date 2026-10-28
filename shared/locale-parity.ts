/**
 * Locale key-tree parity helpers — pure functions shared by the
 * instantiation contract test (test/unit/instantiation-contract.test.ts)
 * and scripts/instantiate-locale.ts.
 *
 * fr.json is the REFERENCE key tree: code depends on fr keys existing in
 * every active locale (missing keys silently fall back to French at
 * runtime, which ships a half-translated site). Deliberately dependency-free
 * (no directoryConfig import) so tsx scripts and vitest lanes can both load
 * it without pulling engine state.
 */

/** All leaf keys of a locale JSON tree, dot-joined (`home.title.pt1`). */
export function flattenLocaleTree(value: unknown, prefix = ""): string[] {
  const keys: string[] = [];
  if (value === null || typeof value !== "object") {
    return prefix ? [prefix] : [];
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === "object" && !Array.isArray(child)) {
      keys.push(...flattenLocaleTree(child, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

/**
 * Map of every leaf key to its string value (non-string leaves — numbers,
 * booleans — are skipped: they carry no interpolation placeholders).
 */
export function localeLeafMap(tree: unknown): Map<string, string> {
  const leaves = new Map<string, string>();
  const walk = (value: unknown, prefix: string): void => {
    if (value === null || typeof value !== "object") {
      if (prefix && typeof value === "string") leaves.set(prefix, value);
      return;
    }
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      walk(child, prefix ? `${prefix}.${key}` : key);
    }
  };
  walk(tree, "");
  return leaves;
}

/**
 * vue-i18n interpolation params of a translation string, normalized
 * (trimmed): `{category}` → "category". Sets are compared, so repeated
 * params and reordering are fine — a MISSING or RENAMED param is the bug
 * class this catches (draft files copy-pasted across locales keep
 * language-specific params like `{categoryLe}`).
 */
export function extractPlaceholders(text: string): string[] {
  return [...text.matchAll(/\{([^{}]+)\}/g)]
    .map((match) => match[1].trim())
    .sort();
}

/**
 * French elision params (`{categoryLe}` → "l'Escalade", `{categoryDe}` →
 * "d'Escalade") only make sense in French copy; every locale receives them
 * at the call sites anyway (app/components/categories/CityPage.vue passes
 * them unconditionally). Translations legitimately collapse them to plain
 * `{category}` — treat the two as the same param when comparing trees.
 */
const CATEGORY_ELISION_ALIASES: ReadonlySet<string> = new Set([
  "categoryDe",
  "categoryLe",
  "categoryLeCap",
]);

/** Comparable param set of a translation string (elisions folded to `category`). */
export function comparablePlaceholders(text: string): string[] {
  return extractPlaceholders(text).map((param) =>
    CATEGORY_ELISION_ALIASES.has(param) ? "category" : param,
  );
}

/** Set-equality diff of two key trees (fr is the reference). */
export function compareLocaleTree(
  referenceKeys: readonly string[],
  localeKeys: readonly string[],
): { missingInLocale: string[]; extraInLocale: string[] } {
  const localeSet = new Set(localeKeys);
  const referenceSet = new Set(referenceKeys);
  return {
    missingInLocale: referenceKeys.filter((key) => !localeSet.has(key)),
    extraInLocale: localeKeys.filter((key) => !referenceSet.has(key)),
  };
}

/** One placeholder divergence: the locale value lost/renamed an fr param. */
export interface PlaceholderMismatch {
  key: string;
  fr: string[];
  locale: string[];
}

/**
 * Placeholder parity for every key the locale SHARES with the reference.
 * Locale-only keys are ignored (they are flagged by the tree diff, not here).
 * Elision aliases are folded before comparison — see CATEGORY_ELISION_ALIASES.
 */
export function findPlaceholderMismatches(
  referenceLeaves: ReadonlyMap<string, string>,
  localeLeaves: ReadonlyMap<string, string>,
): PlaceholderMismatch[] {
  const mismatches: PlaceholderMismatch[] = [];
  for (const [key, frValue] of referenceLeaves) {
    const localeValue = localeLeaves.get(key);
    if (localeValue === undefined) continue;
    const frParams = comparablePlaceholders(frValue);
    const localeParams = comparablePlaceholders(localeValue);
    if (
      frParams.length !== localeParams.length
      || frParams.some((param, index) => param !== localeParams[index])
    ) {
      mismatches.push({ key, fr: frParams, locale: localeParams });
    }
  }
  return mismatches;
}

/**
 * Minimal i18n surface a launch-coherent ACTIVE locale must provide
 * (tier 2 of the two-tier parity system — see the contract test). Anything
 * else falls back to French silently, but these families render on the
 * highest-traffic surfaces: nav, home hero, footer, legal disclosure,
 * billing chrome, category labels, search and breadcrumbs.
 */
export const REQUIRED_KEY_FAMILIES: readonly string[] = [
  "nav",
  "common",
  "breadcrumb.items.index",
  "affiliate.disclosure",
  "billing",
  "footer",
  "home.title",
  "categories",
  "venues",
  "search",
];

/**
 * Required keys for an active locale: the base families, one
 * `guide.types.<spoke>` label per active silo spoke (the spoke routes label
 * themselves through these keys — a missing one renders the raw slug) and
 * one `facet.<key>` label per config-declared venue facet (facet chips +
 * filter controls render through these keys). `facetKeys` is empty for
 * instantiations without facets — the family is only required when shipped.
 */
export function requiredKeysFor(
  spokes: readonly string[],
  facetKeys: readonly string[] = [],
): string[] {
  return [
    ...REQUIRED_KEY_FAMILIES,
    ...spokes.map((spoke) => `guide.types.${spoke}`),
    ...facetKeys.map((key) => `facet.${key}`),
  ];
}

function isFamilyCovered(localeKeys: ReadonlySet<string>, required: string): boolean {
  if (localeKeys.has(required)) return true;
  const familyPrefix = `${required}.`;
  for (const key of localeKeys) {
    if (key.startsWith(familyPrefix)) return true;
  }
  return false;
}

/** Required keys absent from the locale's key tree. */
export function missingRequiredKeys(
  localeKeys: readonly string[],
  spokes: readonly string[],
  facetKeys: readonly string[] = [],
): string[] {
  const localeSet = new Set(localeKeys);
  return requiredKeysFor(spokes, facetKeys).filter(
    (required) => !isFamilyCovered(localeSet, required),
  );
}

/**
 * Missing keys grouped by top-level family, count-descending — the
 * "what to translate" work list (`dashboard: 197` = translate the whole
 * dashboard family first).
 */
export function summarizeMissingByFamily(
  missingKeys: readonly string[],
): Array<{ family: string; count: number }> {
  const counts = new Map<string, number>();
  for (const key of missingKeys) {
    const family = key.split(".")[0];
    counts.set(family, (counts.get(family) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([family, count]) => ({ family, count }))
    .sort((a, b) => b.count - a.count);
}
