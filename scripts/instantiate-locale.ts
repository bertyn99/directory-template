/**
 * instantiate-locale — prepare a SHIPPED locale (shared/locale-meta.ts) for
 * activation. Complements the two-tier instantiation contract:
 *
 *   pnpm instantiate:locale de
 *
 * What it does:
 * 1. Stubs the content files the active-locale contract asserts
 *    (content/<code>/category-guides/_directory/guide.md for the footer
 *    /venues/guide link, one blog article, one category guide) — copied
 *    verbatim from fr with a TODO marker, so activation never 404s.
 * 2. Copies i18n/locales/<code>.json from fr.json when missing.
 * 3. Reports the key parity vs fr.json (the reference tree) and the
 *    launch-critical checks, then prints the activation checklist.
 *
 * What it deliberately does NOT do: edit directory.config.ts. Activation is
 * a human decision (locales list) with engine-wide effects (content
 * collections, sitemap, hreflang) — flip it manually, then run the contract
 * test. Idempotent: existing files are never overwritten.
 *
 * Standalone tsx script — plain relative imports (no Nuxt runtime).
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { directoryConfig, type ConfigLocale } from "../directory.config";
import {
  compareLocaleTree,
  findPlaceholderMismatches,
  flattenLocaleTree,
  localeLeafMap,
  missingRequiredKeys,
  summarizeMissingByFamily,
} from "../shared/locale-parity";
import { SHIPPED_LOCALES } from "../shared/locale-meta";
import { majorEuCityImageSlug } from "../shared/major-eu-cities";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fromRoot = (path: string) => join(ROOT_DIR, path);

const ok = (message: string): string => `  ✓ ${message}`;
const warn = (message: string): string => `  ⚠ ${message}`;
const fail = (message: string): string => `  ✗ ${message}`;

/** Insert a prominent TODO marker between the frontmatter and the body. */
function withTodoMarker(markdown: string, code: string): string {
  const marker = `<!-- TODO(${code}): translate — verbatim stub copied from content/fr/. Rewrite the body and the title/description frontmatter for ${code} (keep translationKey — it pairs hreflang across locales), then delete this marker. -->`;
  if (!markdown.startsWith("---")) return `${marker}\n\n${markdown}`;
  const lines = markdown.split("\n");
  const closingIndex = lines.indexOf("---", 1);
  if (closingIndex === -1) return `${marker}\n\n${markdown}`;
  lines.splice(closingIndex + 1, 0, "", marker);
  return lines.join("\n");
}

/** Copy fr markdown to the locale dir as a stub. Returns the action taken. */
function stubFromFr(relativePath: string, code: string): "created" | "exists" | "no-source" {
  const target = fromRoot(`content/${code}/${relativePath}`);
  if (existsSync(target)) return "exists";
  const source = fromRoot(`content/fr/${relativePath}`);
  if (!existsSync(source)) return "no-source";
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, withTodoMarker(readFileSync(source, "utf8"), code), "utf8");
  return "created";
}

function firstFrBlogArticle(): string | null {
  const dir = fromRoot("content/fr/blog");
  if (!existsSync(dir)) return null;
  return (
    readdirSync(dir)
      .filter((name) => name.endsWith(".md"))
      .sort()[0] ?? null
  );
}

function main(): number {
  const code = process.argv[2];
  if (!code) {
    console.error(
      `Usage: pnpm instantiate:locale <code> — shipped locales: ${Object.keys(SHIPPED_LOCALES).join(", ")}`,
    );
    return 1;
  }
  if (!(code in SHIPPED_LOCALES)) {
    console.error(
      `Unknown locale "${code}" — SHIPPED_LOCALES (shared/locale-meta.ts) ships: ${Object.keys(SHIPPED_LOCALES).join(", ")}. Add metadata there first if you need a new locale.`,
    );
    return 1;
  }
  const localeCode = code as ConfigLocale;

  console.log(`instantiate-locale — preparing "${localeCode}"`);
  console.log("─────────────────────────────────────────────");

  const isActive = (directoryConfig.locales as readonly string[]).includes(
    localeCode,
  );
  if (isActive) {
    console.log(
      warn(
        `"${localeCode}" is already active in directory.config.ts (locales: ${directoryConfig.locales.join(", ")}). This script never edits the config — activation/deactivation is a manual edit of directory.config.ts.`,
      ),
    );
  } else {
    console.log(
      `"${localeCode}" is NOT active yet (locales: ${directoryConfig.locales.join(", ")}). This script prepares the files only — activation is a manual edit of directory.config.ts, which derives the content collections, sitemap and hreflang.`,
    );
  }
  console.log();

  // ── 1. Content stubs (the contract's 404 guards) ─────────────────────────
  console.log("content stubs (fr → " + localeCode + ", never overwrites)");
  const firstCategory = directoryConfig.taxonomy.categories[0]?.slug;
  const stubJobs: Array<{ relativePath: string; why: string }> = [];
  const blogArticle = firstFrBlogArticle();
  if (blogArticle) {
    stubJobs.push({ relativePath: `blog/${blogArticle}`, why: "blog route + pillar CTA" });
  }
  stubJobs.push({
    relativePath: "category-guides/_directory/guide.md",
    why: "footer link /venues/guide (404 guard)",
  });
  if (firstCategory) {
    stubJobs.push({
      relativePath: `category-guides/${firstCategory}/guide.md`,
      why: `silo hub of the first category ("${firstCategory}")`,
    });
  }
  for (const job of stubJobs) {
    const result = stubFromFr(job.relativePath, localeCode);
    if (result === "created") {
      console.log(ok(`created content/${localeCode}/${job.relativePath} (${job.why})`));
    } else if (result === "exists") {
      console.log(`  • content/${localeCode}/${job.relativePath} already exists — left untouched`);
    } else {
      console.log(fail(`no content/fr/${job.relativePath} to copy (${job.why})`));
    }
  }
  console.log();

  // ── 2. Locale file + parity report vs fr (the reference tree) ────────────
  const localeJsonPath = fromRoot(`i18n/locales/${localeCode}.json`);
  if (!existsSync(localeJsonPath)) {
    mkdirSync(dirname(localeJsonPath), { recursive: true });
    writeFileSync(
      localeJsonPath,
      readFileSync(fromRoot("i18n/locales/fr.json"), "utf8"),
      "utf8",
    );
    console.log(ok(`created i18n/locales/${localeCode}.json (copy of fr.json — translate it)`));
  } else {
    console.log(`  • i18n/locales/${localeCode}.json exists — left untouched`);
  }

  const frTree = JSON.parse(readFileSync(fromRoot("i18n/locales/fr.json"), "utf8")) as unknown;
  const localeTree = JSON.parse(readFileSync(localeJsonPath, "utf8")) as unknown;
  const frKeys = flattenLocaleTree(frTree);
  const localeKeys = flattenLocaleTree(localeTree);
  const { missingInLocale, extraInLocale } = compareLocaleTree(frKeys, localeKeys);

  console.log(`  key parity vs fr.json (reference, ${frKeys.length} keys):`);
  console.log(
    `    ${localeCode}.json carries ${localeKeys.length} keys — ${missingInLocale.length} missing, ${extraInLocale.length} extra`,
  );
  const families = summarizeMissingByFamily(missingInLocale).slice(0, 10);
  if (families.length > 0) {
    console.log(
      `    missing by family: ${families.map((f) => `${f.family} (${f.count})`).join(", ")}`,
    );
  }
  if (extraInLocale.length > 0) {
    console.log(
      `    extra (dead) keys to delete: ${extraInLocale.slice(0, 10).join(", ")}${extraInLocale.length > 10 ? ` … (+${extraInLocale.length - 10} more)` : ""}`,
    );
  }
  const placeholderMismatches = findPlaceholderMismatches(
    localeLeafMap(frTree),
    localeLeafMap(localeTree),
  );
  console.log(
    placeholderMismatches.length === 0
      ? "    interpolation placeholders: all shared keys match fr"
      : fail(
          `interpolation placeholders diverge on ${placeholderMismatches.length} keys (renders the raw {name} at runtime): ${placeholderMismatches.slice(0, 5).map((m) => m.key).join(", ")}`,
        ),
  );

  const missingRequired = missingRequiredKeys(
    localeKeys,
    directoryConfig.content.siloSpokes,
    directoryConfig.taxonomy.facets.map((facet) => facet.key),
  );
  console.log(
    missingRequired.length === 0
      ? ok("launch-critical families all present (nav, home.title, search, guide.types.*, …)")
      : fail(`launch-critical keys missing: ${missingRequired.join(", ")}`),
  );
  console.log();

  // ── 3. Launch checks ─────────────────────────────────────────────────────
  console.log("checks");
  const disclosure = (localeTree as { affiliate?: { disclosure?: unknown } }).affiliate
    ?.disclosure;
  console.log(
    typeof disclosure === "string" && disclosure.length > 0
      ? ok(`affiliate.disclosure non-empty ("${disclosure.slice(0, 48)}…")`)
      : fail(`${localeCode}.json affiliate.disclosure is empty — mandatory legal copy`),
  );
  const billingKeys = flattenLocaleTree(
    (localeTree as { billing?: unknown }).billing ?? {},
  ).length;
  console.log(
    billingKeys > 0
      ? ok(`billing keys present (${billingKeys})`)
      : fail("billing family empty — pricing-table chrome would fall back to French"),
  );
  const missingBanners = directoryConfig.scraping.seedCities.filter(
    (city) => !existsSync(fromRoot(`public/img/cities/${majorEuCityImageSlug(city)}.jpg`)),
  );
  console.log(
    missingBanners.length === 0
      ? ok(`seedCity banners present (${directoryConfig.scraping.seedCities.join(", ")})`)
      : fail(`seedCity banners missing: ${missingBanners.join(", ")} (public/img/cities/<slug>.jpg)`),
  );
  console.log();

  // ── 4. Activation checklist ──────────────────────────────────────────────
  console.log(`next steps — activate "${localeCode}"`);
  if (missingInLocale.length > 0) {
    console.log(
      `  [ ] translate the missing families in i18n/locales/${localeCode}.json (${missingInLocale.length} keys — missing keys silently render French)`,
    );
  }
  if (extraInLocale.length > 0) {
    console.log(`  [ ] delete the ${extraInLocale.length} dead keys no longer in the fr tree`);
  }
  if (placeholderMismatches.length > 0) {
    console.log(`  [ ] fix the ${placeholderMismatches.length} interpolation placeholders listed above`);
  }
  console.log(
    `  [ ] rewrite the content stubs (search "TODO(${localeCode})" under content/${localeCode}/)`,
  );
  if (!isActive) {
    console.log(
      `  [ ] activate: add "${localeCode}" to locales in directory.config.ts (this single edit creates the content collections, routes, sitemap and hreflang)`,
    );
  }
  console.log(
    "  [ ] pnpm test:unit — the instantiation contract enforces the launch-critical families, placeholder parity and the content files",
  );
  console.log(
    `  [ ] translation complete? raise "${localeCode}" from draft to VERIFIED_LOCALES in test/unit/instantiation-contract.test.ts (opts into full key-tree parity with fr)`,
  );
  return 0;
}

process.exit(main());
