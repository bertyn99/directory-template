import { describe, expect, it } from "vitest";
import { directoryConfig } from "~~/directory.config";
import {
  AFFILIATE_PRODUCTS,
  EMPTY_AFFILIATE_TAGS,
  buildPartnerUrl,
  buildProductLink,
  isAffiliatePartner,
  partnerLabel,
  partnerProgramAvailable,
  resolveKitProductIds,
} from "~~/shared/affiliates";

const RAKUTEN_TAGS = { ...EMPTY_AFFILIATE_TAGS, rakutenSiteId: "site-123" };
const AWIN_TAGS = { ...EMPTY_AFFILIATE_TAGS, awinAffid: "54321" };

describe("affiliate catalog", () => {
  it("ships the sample kit declared in directory.config", () => {
    const kit = resolveKitProductIds("any-category-slug");
    expect(kit).toEqual([...directoryConfig.affiliates.kit]);
    for (const id of kit) {
      expect(AFFILIATE_PRODUCTS[id]).toBeDefined();
    }
  });

  it("keeps the sport argument attribution-only (same kit for every slug)", () => {
    expect(resolveKitProductIds("fitness")).toEqual(
      resolveKitProductIds("totally-unknown"),
    );
  });

  it("appends Amazon tags only when configured", () => {
    const bare = buildPartnerUrl("amazon", "yoga mat", "en", EMPTY_AFFILIATE_TAGS);
    expect(bare).toContain("https://www.amazon.com/s");
    expect(bare).not.toContain("tag=");

    const tagged = buildPartnerUrl("amazon", "yoga mat", "en", {
      ...EMPTY_AFFILIATE_TAGS,
      amazonTagUs: "sample-20",
    });
    expect(tagged).toContain("tag=sample-20");
  });

  it("routes French shoppers to amazon.fr", () => {
    const amazonFr = buildPartnerUrl("amazon", "tapis de yoga", "fr", {
      ...EMPTY_AFFILIATE_TAGS,
      amazonTagFr: "sample-fr-21",
    });
    expect(amazonFr).toContain("https://www.amazon.fr/s");
    expect(amazonFr).toContain("tag=sample-fr-21");
  });

  it("routes Portuguese shoppers to their OWN tag on the amazon.es storefront", () => {
    // Amazon has no PT marketplace — the storefront is amazon.es, but the
    // associate tag must be amazonTagPt (regression: pt used to read the
    // ES tag, crediting the wrong associate program).
    const amazonPt = buildPartnerUrl("amazon", "tapete de yoga", "pt", {
      ...EMPTY_AFFILIATE_TAGS,
      amazonTagPt: "sample-pt-21",
    });
    expect(amazonPt).toContain("https://www.amazon.es/s");
    expect(amazonPt).toContain("tag=sample-pt-21");

    // Only the pt tag applies in pt — an ES tag alone stays off the link.
    const esOnly = buildPartnerUrl("amazon", "tapete de yoga", "pt", {
      ...EMPTY_AFFILIATE_TAGS,
      amazonTagEs: "sample-es-21",
    });
    expect(esOnly).not.toContain("tag=");
  });

  it("wraps the FR Rakuten program with u1 sub-tracking", () => {
    const url = buildPartnerUrl(
      "decathlon",
      "tapis de yoga",
      "fr",
      RAKUTEN_TAGS,
      { slot: "yoga-mat", placement: "guide-kit" },
    );
    const parsed = new URL(url);
    expect(parsed.host).toBe("click.linksynergy.com");
    expect(parsed.searchParams.get("id")).toBe("site-123");
    expect(parsed.searchParams.get("u1")).toBe("yoga-mat-guide-kit");
    const murl = new URL(parsed.searchParams.get("murl") ?? "");
    expect(murl.host).toBe("www.decathlon.fr");
    expect(murl.searchParams.get("Ntt")).toBe("tapis de yoga");

    // Without the publisher id: plain storefront URL (button itself is hidden).
    const bare = buildPartnerUrl("decathlon", "tapis de yoga", "fr", EMPTY_AFFILIATE_TAGS);
    expect(new URL(bare).host).toBe("www.decathlon.fr");
  });

  it("hides the partner until its program is creditable in the locale", () => {
    // FR Decathlon runs on Rakuten: needs the publisher site id.
    expect(partnerProgramAvailable("decathlon", "fr", EMPTY_AFFILIATE_TAGS)).toBe(false);
    expect(partnerProgramAvailable("decathlon", "fr", RAKUTEN_TAGS)).toBe(true);

    // DE Decathlon runs on Awin with an EMPTY merchant id in the sample config.
    expect(partnerProgramAvailable("decathlon", "de", AWIN_TAGS)).toBe(false);

    // en has no Decathlon program at all — never available, however configured.
    expect(partnerProgramAvailable("decathlon", "en", RAKUTEN_TAGS)).toBe(false);
  });

  it("builds product links with Amazon default and a gated Decathlon alt", () => {
    const fr = buildProductLink(
      "yoga-mat",
      "fr",
      RAKUTEN_TAGS,
      undefined,
      { slot: "yoga-mat", placement: "guide-kit" },
    );
    expect(fr?.partner).toBe("amazon");
    expect(new URL(fr?.href ?? "").host).toBe("www.amazon.fr");
    expect(fr?.alt?.partner).toBe("decathlon");
    expect(new URL(fr?.alt?.href ?? "").host).toBe("click.linksynergy.com");
    expect(new URL(fr?.alt?.href ?? "").searchParams.get("u1")).toBe(
      "yoga-mat-guide-kit",
    );

    // Gating invariant: unavailable program ⇒ alt href emptied (button hidden).
    const de = buildProductLink("yoga-mat", "de", AWIN_TAGS);
    expect(de?.alt?.href).toBe("");
  });

  it("narrows partner names against the config registry", () => {
    expect(isAffiliatePartner("amazon")).toBe(true);
    expect(isAffiliatePartner("decathlon")).toBe(true);
    expect(isAffiliatePartner("adsense")).toBe(false);
    expect(partnerLabel("amazon")).toBe("Amazon");
    expect(partnerLabel("decathlon")).toBe("Decathlon");
  });
});
