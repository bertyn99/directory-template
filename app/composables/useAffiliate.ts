import {
  EMPTY_AFFILIATE_TAGS,
  type AffiliatePartner,
  type AffiliateSubid,
  type AffiliateTags,
  buildProductLink,
  getAffiliateProduct,
  isAffiliatePartner,
  partnerProgramAvailable,
  resolveKitProducts,
} from "~~/shared/affiliates";

/**
 * Affiliate runtime — binds shared/affiliates.ts to the current locale and
 * the runtimeConfig publisher tags. The catalog/kit/partner data itself lives
 * in directory.config.ts (affiliates section).
 */
export function useAffiliate() {
  const { locale } = useI18n();
  const config = useRuntimeConfig();
  const tags = computed(() => {
    const publicConfig = config.public as { affiliate?: Partial<AffiliateTags> };
    const affiliate = publicConfig.affiliate ?? {};
    return {
      amazonTagUs: affiliate.amazonTagUs ?? EMPTY_AFFILIATE_TAGS.amazonTagUs,
      amazonTagUk: affiliate.amazonTagUk ?? EMPTY_AFFILIATE_TAGS.amazonTagUk,
      amazonTagFr: affiliate.amazonTagFr ?? EMPTY_AFFILIATE_TAGS.amazonTagFr,
      amazonTagDe: affiliate.amazonTagDe ?? EMPTY_AFFILIATE_TAGS.amazonTagDe,
      amazonTagEs: affiliate.amazonTagEs ?? EMPTY_AFFILIATE_TAGS.amazonTagEs,
      amazonTagIt: affiliate.amazonTagIt ?? EMPTY_AFFILIATE_TAGS.amazonTagIt,
      amazonTagPt: affiliate.amazonTagPt ?? EMPTY_AFFILIATE_TAGS.amazonTagPt,
      awinAffid: affiliate.awinAffid ?? EMPTY_AFFILIATE_TAGS.awinAffid,
      rakutenSiteId: affiliate.rakutenSiteId ?? EMPTY_AFFILIATE_TAGS.rakutenSiteId,
    };
  });

  /**
   * Whether the current locale has a creditable program for a config partner
   * (directory.config.ts affiliates.partners) — the only condition under
   * which its button may render.
   */
  function partnerEnabled(partner: string) {
    return partnerProgramAvailable(partner, locale.value, tags.value);
  }

  function parsePartner(value: string | undefined): AffiliatePartner | undefined {
    if (!value) {
      return undefined;
    }
    return isAffiliatePartner(value) ? value : undefined;
  }

  function productLink(productId: string, partner?: string, subid?: AffiliateSubid) {
    return buildProductLink(
      productId,
      locale.value,
      tags.value,
      parsePartner(partner),
      subid,
    );
  }

  /** The sample kit (directory.config.ts affiliates.kit) with built links. */
  function kitForSport(sport: string, subid?: AffiliateSubid) {
    return resolveKitProducts(sport).map((product) => {
      const link = productLink(product.id, undefined, subid);
      return {
        product,
        href: link?.href ?? "#",
        partner: link?.partner ?? product.partner,
        alt: link?.alt?.href ? link.alt : undefined,
      };
    });
  }

  /**
   * Single-product pick (the `::nutrition-pick` MDC block). Unknown ids fall
   * back to the first kit product. Always resolves — Amazon links work
   * without tags, and the secondary partner stays gated by its program.
   */
  function nutritionFor(productId: string, partner?: string) {
    const id = getAffiliateProduct(productId)
      ? productId
      : resolveKitProducts()[0]?.id;
    if (!id) {
      return undefined;
    }
    const link = productLink(id, partner);
    if (!link) {
      return undefined;
    }
    return {
      product: link.product,
      href: link.href,
      partner: link.partner,
    };
  }

  return {
    kitForSport,
    nutritionFor,
    productLink,
    parsePartner,
    partnerEnabled,
  };
}
