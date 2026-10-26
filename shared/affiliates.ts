/**
 * Affiliate engine — Amazon (built-in default) + config-defined partners.
 *
 * DATA vs MECHANISM split:
 * - The product catalog, partner program maps and the sample kit are DATA,
 *   configured per instantiation in directory.config.ts (affiliates section).
 * - This module implements the MECHANISM only: URL building, per-network
 *   tracking wrappers (Rakuten deeplink / Awin cread.php), sub-tracking and
 *   availability gating. Changing niche/merchants never touches this file.
 *
 * Template rules (do NOT break when extending):
 * - A partner button renders ONLY when the locale's program is fully
 *   configured (partnerProgramAvailable()): empty publisher/merchant id ⇒
 *   hidden button. No traffic ever goes to a merchant we cannot be credited
 *   for.
 * - Amazon is the default destination; config partners are secondary buttons
 *   (product.alt) on the same card, never a second block.
 * - Sub-tracking: Rakuten u1 / Awin clickref = `<slot>-<placement>` (usually
 *   `<category-slug>-<placement>`).
 * - rel="sponsored noopener noreferrer" (AFFILIATE_REL) + the disclosure
 *   string (directoryConfig.affiliates.disclosure) are mandatory on every
 *   affiliate link (FR: loi "confiance dans l'économie numérique").
 * - Never surface promo codes (merchant program terms).
 *
 * Publisher tracking ids live in runtimeConfig (env). Links still resolve as
 * plain search URLs without them so the UI works before programs are
 * approved.
 */

import type {
  AffiliatePartnerConfig,
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

/** A destination for a product on a specific partner. */
export type AffiliateOffer = {
  partner: AffiliatePartner;
  queries: LocalizedCopy;
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
 * True when the locale's program has every tracking id it needs — the ONLY
 * condition under which a partner button may render. This gating is a
 * template invariant: an empty id ⇒ hidden button, never an uncredited click.
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
  return program.network === "rakuten"
    ? Boolean(tags.rakutenSiteId)
    : Boolean(tags.awinAffid && program.awinMid);
}

export type AffiliateProduct = {
  id: string;
  icon: string;
  /** Default destination — kept for consumers that only need one partner. */
  partner: AffiliatePartner;
  names: LocalizedCopy;
  blurbs: LocalizedCopy;
  /** Search query used for the default partner. */
  queries: LocalizedCopy;
  /**
   * Secondary destination rendered as an extra button on the same card
   * (e.g. Decathlon next to the Amazon link). Only rendered when the partner
   * has a creditable program for the current locale.
   */
  alt?: AffiliateOffer;
};

function configProduct(config: {
  id: string;
  icon: string;
  names: LocalizedText;
  blurbs: LocalizedText;
  queries: LocalizedText;
  alt?: { partner: string; queries: LocalizedText };
}): AffiliateProduct {
  return {
    id: config.id,
    icon: config.icon,
    partner: "amazon",
    names: config.names,
    blurbs: config.blurbs,
    queries: config.queries,
    ...(config.alt
      ? {
        alt: {
          partner: config.alt.partner as AffiliatePartner,
          queries: config.alt.queries,
        },
      }
      : {}),
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
      return tags.amazonTagEs;
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
 * Tracked search URL on a config-partner storefront. Without the network's
 * publisher/merchant ids the plain storefront URL is returned (UI works
 * pre-approval); the button itself is hidden in that case by
 * partnerProgramAvailable(), so the untracked URL never ships.
 */
function buildProgramUrl(
  partner: string,
  query: string,
  locale: ConfigLocale,
  tags: AffiliateTags,
  subid?: AffiliateSubid,
): string {
  const program = partnerProgram(partner, locale) ?? fallbackProgram(partner);
  if (!program) {
    return "";
  }
  const searchPath = program.searchPath ?? "/search";
  // "Ntt" is the Decathlon storefront's query parameter (the example partner).
  const queryParam = program.queryParam ?? "Ntt";
  const dest = new URL(`https://${program.host}${searchPath}`);
  dest.searchParams.set(queryParam, query);
  const href = dest.toString();

  const token = programSubid(subid);
  if (program.network === "rakuten") {
    if (!tags.rakutenSiteId) {
      return href;
    }
    const wrap = new URL("https://click.linksynergy.com/deeplink");
    wrap.searchParams.set("id", tags.rakutenSiteId);
    wrap.searchParams.set("murl", href);
    if (token) {
      wrap.searchParams.set("u1", token);
    }
    return wrap.toString();
  }

  if (!tags.awinAffid || !program.awinMid) {
    return href;
  }
  const wrap = new URL("https://www.awin1.com/cread.php");
  wrap.searchParams.set("awinmid", program.awinMid);
  wrap.searchParams.set("awinaffid", tags.awinAffid);
  if (token) {
    wrap.searchParams.set("clickref", token);
  }
  wrap.searchParams.set("ued", href);
  return wrap.toString();
}

export function buildPartnerUrl(
  partner: AffiliatePartner,
  query: string,
  locale: string,
  tags: AffiliateTags,
  subid?: AffiliateSubid,
): string {
  const loc = normalizeLocale(locale);
  if (partner === "amazon") {
    return buildAmazonUrl(query, loc, tags);
  }
  return buildProgramUrl(partner, query, loc, tags, subid);
}

export type ProductLink = {
  href: string;
  partner: AffiliatePartner;
  product: AffiliateProduct;
  /** Secondary partner button, present only when that partner is live here. */
  alt?: { href: string; partner: AffiliatePartner };
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
  const query = localizedCopy(item.queries, locale);
  const alt =
    item.alt && partner !== item.alt.partner
      ? {
        partner: item.alt.partner,
        // Gating invariant: an unavailable program empties the href so the
        // card hides the secondary button instead of shipping an untracked
        // link.
        href:
          item.alt.partner !== "amazon"
            && !partnerProgramAvailable(item.alt.partner, locale, tags)
            ? ""
            : buildPartnerUrl(
              item.alt.partner,
              localizedCopy(item.alt.queries, locale),
              locale,
              tags,
              subid,
            ),
      }
      : undefined;
  return {
    product: item,
    partner,
    href: buildPartnerUrl(partner, query, locale, tags, subid),
    ...(alt ? { alt } : {}),
  };
}
