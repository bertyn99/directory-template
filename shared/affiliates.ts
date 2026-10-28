/**
 * Affiliate engine — Amazon (built-in) + config-defined partners, in search
 * or direct link mode.
 *
 * DATA vs MECHANISM split:
 * - The product catalog, partner program maps and the sample kit are DATA,
 *   configured per instantiation in directory.config.ts (affiliates section).
 * - This module implements the MECHANISM only: URL building (storefront
 *   search OR fixed direct landing), per-network tracking wrappers (Rakuten
 *   deeplink / Awin cread.php), sub-tracking and availability gating.
 *   Changing niche/merchants never touches this file.
 *
 * Template rules (do NOT break when extending):
 * - A partner button renders ONLY when the locale's program is fully
 *   configured (partnerProgramAvailable()): empty publisher/merchant id ⇒
 *   hidden button; a DIRECT program with no landing URL for the locale ⇒
 *   hidden button. No traffic ever goes to a merchant we cannot be credited
 *   for.
 * - Amazon is a DEFAULT destination (always renderable, tags optional);
 *   each product picks its own `primary` partner (default amazon) and 0..n
 *   `alts` — the hardcoded Amazon primary is gone.
 * - Sub-tracking: Rakuten u1 / Awin clickref = `<slot>-<placement>` (usually
 *   `<category-slug>-<placement>`).
 * - rel="sponsored noopener noreferrer" (AFFILIATE_REL) + the disclosure
 *   string (i18n key `affiliate.disclosure` — translatable legal copy, the
 *   locale files are its only source) are mandatory on every
 *   affiliate link (FR: loi "confiance dans l'économie numérique").
 * - Never surface promo codes (merchant program terms).
 *
 * Publisher tracking ids live in runtimeConfig (env). Search links still
 * resolve as plain search URLs without them so the UI works before programs
 * are approved; the buttons themselves are hidden in that case by
 * partnerProgramAvailable(), so the untracked URL never ships.
 */

import type {
  AffiliatePartnerConfig,
  AffiliateProductConfig,
  ConfigLocale,
  LocalizedText,
  PartnerProgram,
} from "~~/directory.config";
import { directoryConfig } from "~~/directory.config";

/**
 * Locales the engine can build links for — the full ConfigLocale set, not
 * just the active locales (inactive-locale visitors fall back to en).
 */
const AFFILIATE_LOCALES: ConfigLocale[] = ["fr", "en", "de", "es", "it", "pt"];

function normalizeLocale(locale: string): ConfigLocale {
  return (
    AFFILIATE_LOCALES.includes(locale as ConfigLocale) ? locale : "en"
  ) as ConfigLocale;
}

/** Partner ids: "amazon" (built-in default) + the config partner registry keys. */
export type AffiliatePartner =
  | "amazon"
  | keyof typeof directoryConfig.affiliates.partners;

/** French-first localized copy (same shape as directory.config LocalizedText). */
export type LocalizedCopy = LocalizedText;

/** Per-locale fixed landing URLs (direct mode) — same shape as config `urls`. */
export type LocalizedUrls = Partial<Record<ConfigLocale, string>>;

/** A destination for a product on a specific partner. */
export type AffiliateOffer = {
  partner: AffiliatePartner;
  /** Search query — REQUIRED for search-mode partners, unused for direct. */
  queries?: LocalizedCopy;
  /**
   * Product-level direct landing URL per locale — overrides the partner
   * program's own `urls` per locale (a product that IS a single landing
   * offer). Ignored for search-mode partners and Amazon.
   */
  urls?: LocalizedUrls;
};

/** Per-subid token sent to the network for click-level attribution. */
export type AffiliateSubid = {
  /** u1 (Rakuten) / clickref (Awin) — usually the category slug. */
  slot?: string;
  /** u2 (Rakuten) — usually the placement, e.g. "guide-kit". */
  placement?: string;
};

export type AffiliateTags = {
  amazonTagUs: string;
  amazonTagUk: string;
  amazonTagFr: string;
  amazonTagDe: string;
  amazonTagEs: string;
  amazonTagIt: string;
  amazonTagPt: string;
  awinAffid: string;
  rakutenSiteId: string;
};

export const EMPTY_AFFILIATE_TAGS: AffiliateTags = {
  amazonTagUs: "",
  amazonTagUk: "",
  amazonTagFr: "",
  amazonTagDe: "",
  amazonTagEs: "",
  amazonTagIt: "",
  amazonTagPt: "",
  awinAffid: "",
  rakutenSiteId: "",
};

export const AFFILIATE_REL = "sponsored noopener noreferrer";

const AMAZON_HOST: Record<ConfigLocale, string> = {
  en: "www.amazon.com",
  fr: "www.amazon.fr",
  de: "www.amazon.de",
  es: "www.amazon.es",
  it: "www.amazon.it",
  // Amazon has no Portuguese marketplace — pt shoppers buy on amazon.es.
  // The associate TAG, however, is per-locale (amazonTagPt), not the ES one.
  pt: "www.amazon.es",
};

/** Config partner registry, string-indexed for runtime lookups. */
const PARTNERS = directoryConfig.affiliates
  .partners as Record<string, AffiliatePartnerConfig>;

/**
 * The locale's program for a partner — undefined when the partner is unknown
 * or has no program for that locale (e.g. Decathlon/en).
 */
export function partnerProgram(
  partner: string,
  locale: string,
): PartnerProgram | undefined {
  const registry = PARTNERS[partner];
  if (!registry) return undefined;
  return registry.programs[normalizeLocale(locale)] ?? undefined;
}

/**
 * Fallback program when the locale has none: the config default locale first,
 * then the first configured program — so a reader never lands on the
 * corporate site instead of a storefront.
 */
function fallbackProgram(partner: string): PartnerProgram | undefined {
  const registry = PARTNERS[partner];
  if (!registry) return undefined;
  return (
    registry.programs[directoryConfig.defaultLocale] ??
    Object.values(registry.programs).find((program) => program != null) ??
    undefined
  );
}

/**
 * True when the network's tracking ids are present for this program — the
 * "creditable" half of the gating (see partnerProgramAvailable).
 */
function programCreditable(program: PartnerProgram, tags: AffiliateTags): boolean {
  return program.network === "rakuten"
    ? Boolean(tags.rakutenSiteId)
    : Boolean(tags.awinAffid && program.awinMid);
}

/** DIRECT-mode program (fixed landing URL per locale, no storefront search). */
function isDirectProgram(program: PartnerProgram): boolean {
  return program.linkMode === "direct";
}

/**
 * The effective direct landing for a locale: the product-level URL first,
 * then the program's own per-locale landing. Undefined ⇒ no landing for
 * this locale.
 */
function directLanding(
  program: PartnerProgram,
  locale: ConfigLocale,
  productUrls?: LocalizedUrls,
): string | undefined {
  return productUrls?.[locale] ?? program.urls?.[locale];
}

/**
 * Pure program-level availability: tracking ids present (and, for DIRECT
 * programs, a landing URL for the locale). Testable against synthetic
 * programs; partnerProgramAvailable() is its name-based wrapper.
 */
export function programAvailable(
  program: PartnerProgram,
  locale: string,
  tags: AffiliateTags,
): boolean {
  if (!programCreditable(program, tags)) {
    return false;
  }
  if (isDirectProgram(program)) {
    return Boolean(directLanding(program, normalizeLocale(locale)));
  }
  return true;
}

/**
 * True when the locale's program has every tracking id it needs (and, for
 * DIRECT programs, a landing URL for the locale) — the ONLY condition under
 * which a partner button may render. This gating is a template invariant:
 * an empty id, or a direct partner with no url for the locale, ⇒ hidden
 * button — never an uncredited click, never a half-configured partner.
 */
export function partnerProgramAvailable(
  partner: string,
  locale: string,
  tags: AffiliateTags,
): boolean {
  const program = partnerProgram(partner, locale);
  if (!program) {
    return false;
  }
  return programAvailable(program, locale, tags);
}

/** Default i18n key of a product card's primary CTA ("Acheter"/"Shop"). */
export const DEFAULT_CTA_KEY = "affiliate.shopCta";

export type AffiliateProduct = {
  id: string;
  icon: string;
  /**
   * Partner of the PRIMARY button — product.primary ?? "amazon". A
   * config-partner primary is gated like any partner button (unconfigured
   * program in the locale ⇒ button hidden); Amazon always renders.
   */
  partner: AffiliatePartner;
  names: LocalizedCopy;
  blurbs: LocalizedCopy;
  /** Search query for the primary partner (search-mode partners only). */
  queries?: LocalizedCopy;
  /** Product-level direct landing URLs (direct-mode offers, see AffiliateOffer). */
  urls?: LocalizedUrls;
  /**
   * Secondary destinations rendered as extra buttons on the same card
   * (e.g. Decathlon next to the Amazon link). Each renders only when its
   * partner has a creditable program for the current locale.
   */
  alts: AffiliateOffer[];
  /** i18n key of the primary CTA — product.ctaKey ?? "affiliate.shopCta". */
  ctaKey: string;
};

function configProduct(config: AffiliateProductConfig): AffiliateProduct {
  const primary = config.primary;
  return {
    id: config.id,
    icon: config.icon,
    partner:
      primary && isAffiliatePartner(primary)
        ? primary
        : "amazon",
    names: config.names,
    blurbs: config.blurbs,
    ...(config.queries ? { queries: config.queries } : {}),
    ...(config.urls ? { urls: config.urls } : {}),
    alts: (config.alts ?? []).flatMap((alt) =>
      isAffiliatePartner(alt.partner)
        ? [{
          partner: alt.partner,
          ...(alt.queries ? { queries: alt.queries } : {}),
          ...(alt.urls ? { urls: alt.urls } : {}),
        }]
        : [],
    ),
    ctaKey: config.ctaKey ?? DEFAULT_CTA_KEY,
  };
}

/**
 * Product catalog — SAMPLE products from directory.config.ts
 * (affiliates.products). Clearly placeholder content: replace with the
 * niche's real gear when instantiating.
 */
export const AFFILIATE_PRODUCTS: Record<string, AffiliateProduct> =
  Object.fromEntries(
    directoryConfig.affiliates.products.map((config) => [
      config.id,
      configProduct(config),
    ]),
  );

export function isAffiliatePartner(value: string): value is AffiliatePartner {
  return value === "amazon" || value in PARTNERS;
}

export function partnerLabel(partner: AffiliatePartner): string {
  if (partner === "amazon") {
    return "Amazon";
  }
  return PARTNERS[partner]?.label ?? partner;
}

export function localizedCopy(
  copy: LocalizedCopy,
  locale: string,
): string {
  const loc = locale as ConfigLocale;
  return copy[loc] || copy.en || copy.fr;
}

export function getAffiliateProduct(id: string): AffiliateProduct | undefined {
  return AFFILIATE_PRODUCTS[id];
}

/**
 * The ONE sample kit from directory.config.ts (affiliates.kit). The `sport`
 * argument is kept for the `::equipment-kit{sport="…"}` MDC signature — it is
 * used only for click attribution (subid), not kit selection. Reintroduce
 * per-category kits by extending this lookup when instantiating.
 */
export function resolveKitProductIds(_sport?: string): string[] {
  return directoryConfig.affiliates.kit.filter((id) => id in AFFILIATE_PRODUCTS);
}

export function resolveKitProducts(sport?: string): AffiliateProduct[] {
  return resolveKitProductIds(sport)
    .map((id) => AFFILIATE_PRODUCTS[id])
    .filter((item): item is AffiliateProduct => Boolean(item));
}

function amazonTagForLocale(locale: ConfigLocale, tags: AffiliateTags): string {
  switch (locale) {
    case "en":
      return tags.amazonTagUs || tags.amazonTagUk;
    case "fr":
      return tags.amazonTagFr;
    case "de":
      return tags.amazonTagDe;
    case "es":
      return tags.amazonTagEs;
    case "it":
      return tags.amazonTagIt;
    case "pt":
      return tags.amazonTagPt;
    default: {
      const _exhaustive: never = locale;
      return _exhaustive;
    }
  }
}

function buildAmazonUrl(query: string, locale: ConfigLocale, tags: AffiliateTags): string {
  const url = new URL(`https://${AMAZON_HOST[locale]}/s`);
  url.searchParams.set("k", query);
  const tag = amazonTagForLocale(locale, tags);
  if (tag) {
    url.searchParams.set("tag", tag);
  }
  return url.toString();
}

/** u1 (Rakuten) / clickref (Awin) token: `<slot>-<placement>`. */
function programSubid(subid?: AffiliateSubid): string | undefined {
  if (!subid) {
    return undefined;
  }
  return [subid.slot, subid.placement].filter(Boolean).join("-") || undefined;
}

/**
 * The program's destination URL: a storefront search URL (search mode) or a
 * fixed direct landing (direct mode). Untracked — network wrappers are
 * applied by buildProgramLinkUrl.
 */
function programDestination(
  program: PartnerProgram,
  locale: ConfigLocale,
  query: string,
  productUrls?: LocalizedUrls,
): string | undefined {
  if (isDirectProgram(program)) {
    // Direct mode: the fixed landing only — the query is never appended.
    return directLanding(program, locale, productUrls);
  }
  if (!program.host) {
    // Malformed search program (host is required there) — unbuildable.
    return undefined;
  }
  const searchPath = program.searchPath ?? "/search";
  // "Ntt" is the Decathlon storefront's query parameter (the example partner).
  const queryParam = program.queryParam ?? "Ntt";
  const dest = new URL(`https://${program.host}${searchPath}`);
  dest.searchParams.set(queryParam, query);
  return dest.toString();
}

/**
 * Tracked URL on a config-partner program — PURE (takes the program object),
 * so direct/search modes and both networks are testable against synthetic
 * programs. Without the network's publisher/merchant ids the plain
 * destination URL is returned (UI works pre-approval); the button itself is
 * hidden in that case by partnerProgramAvailable(), so the untracked URL
 * never ships. A DIRECT program with no landing for the locale returns ""
 * (the button is hidden by the same gating).
 */
export function buildProgramLinkUrl(
  program: PartnerProgram,
  query: string,
  locale: string,
  tags: AffiliateTags,
  subid?: AffiliateSubid,
  productUrls?: LocalizedUrls,
): string {
  const loc = normalizeLocale(locale);
  const dest = programDestination(program, loc, query, productUrls);
  if (!dest) {
    return "";
  }

  const token = programSubid(subid);
  if (program.network === "rakuten") {
    if (!tags.rakutenSiteId) {
      return dest;
    }
    const wrap = new URL("https://click.linksynergy.com/deeplink");
    wrap.searchParams.set("id", tags.rakutenSiteId);
    wrap.searchParams.set("murl", dest);
    if (token) {
      wrap.searchParams.set("u1", token);
    }
    return wrap.toString();
  }

  if (!tags.awinAffid || !program.awinMid) {
    return dest;
  }
  const wrap = new URL("https://www.awin1.com/cread.php");
  wrap.searchParams.set("awinmid", program.awinMid);
  wrap.searchParams.set("awinaffid", tags.awinAffid);
  if (token) {
    wrap.searchParams.set("clickref", token);
  }
  wrap.searchParams.set("ued", dest);
  return wrap.toString();
}

/**
 * Tracked URL for a config partner in a locale. Without the network's
 * publisher/merchant ids the plain destination URL is returned (UI works
 * pre-approval); the button itself is hidden in that case by
 * partnerProgramAvailable(), so the untracked URL never ships.
 */
function buildProgramUrl(
  partner: string,
  query: string,
  locale: ConfigLocale,
  tags: AffiliateTags,
  subid?: AffiliateSubid,
  productUrls?: LocalizedUrls,
): string {
  const program = partnerProgram(partner, locale) ?? fallbackProgram(partner);
  if (!program) {
    return "";
  }
  return buildProgramLinkUrl(program, query, locale, tags, subid, productUrls);
}

export function buildPartnerUrl(
  partner: AffiliatePartner,
  query: string,
  locale: string,
  tags: AffiliateTags,
  subid?: AffiliateSubid,
  productUrls?: LocalizedUrls,
): string {
  const loc = normalizeLocale(locale);
  if (partner === "amazon") {
    return buildAmazonUrl(query, loc, tags);
  }
  return buildProgramUrl(partner, query, loc, tags, subid, productUrls);
}

/**
 * The href for ONE offer (product primary or alt) in a locale — "" when the
 * offer must NOT render. Gating invariant: a config partner without a
 * creditable program in the locale (including a direct partner with no
 * landing URL there) empties the href so the card hides the button instead
 * of shipping an untracked link. Amazon always builds (tags optional).
 */
export function buildOfferUrl(
  offer: AffiliateOffer,
  locale: string,
  tags: AffiliateTags,
  subid?: AffiliateSubid,
): string {
  if (offer.partner !== "amazon" && !partnerProgramAvailable(offer.partner, locale, tags)) {
    return "";
  }
  const query = offer.queries ? localizedCopy(offer.queries, locale) : "";
  return buildPartnerUrl(offer.partner, query, locale, tags, subid, offer.urls);
}

/** One rendered secondary button: gated href + its partner. */
export type ProductLinkAlt = {
  href: string;
  partner: AffiliatePartner;
};

export type ProductLink = {
  /** "" when the primary partner is gated (button hidden) — Amazon never is. */
  href: string;
  partner: AffiliatePartner;
  product: AffiliateProduct;
  /** Secondary partner buttons, in config order, "" href = hidden. */
  alts: ProductLinkAlt[];
};

export function buildProductLink(
  productId: string,
  locale: string,
  tags: AffiliateTags,
  partnerOverride?: AffiliatePartner,
  subid?: AffiliateSubid,
): ProductLink | undefined {
  const item = AFFILIATE_PRODUCTS[productId];
  if (!item) {
    return undefined;
  }
  const partner = partnerOverride ?? item.partner;
  const href = buildOfferUrl(
    {
      partner,
      ...(item.queries ? { queries: item.queries } : {}),
      ...(item.urls ? { urls: item.urls } : {}),
    },
    locale,
    tags,
    subid,
  );
  // An alt identical to the (possibly overridden) primary collapses into it.
  const alts = item.alts
    .filter((alt) => alt.partner !== partner)
    .map((alt) => ({
      partner: alt.partner,
      href: buildOfferUrl(alt, locale, tags, subid),
    }));
  return { product: item, partner, href, alts };
}
