import { describe, expect, it } from "vitest";
import { directoryConfig } from "~~/directory.config";
import type { PartnerProgram } from "~~/directory.config";
import {
  AFFILIATE_PRODUCTS,
  DEFAULT_CTA_KEY,
  EMPTY_AFFILIATE_TAGS,
  buildOfferUrl,
  buildPartnerUrl,
  buildProductLink,
  buildProgramLinkUrl,
  isAffiliatePartner,
  partnerLabel,
  partnerProgramAvailable,
  programAvailable,
  resolveKitProductIds,
} from "~~/shared/affiliates";

const RAKUTEN_TAGS = { ...EMPTY_AFFILIATE_TAGS, rakutenSiteId: "site-123" };
const AWIN_TAGS = { ...EMPTY_AFFILIATE_TAGS, awinAffid: "54321" };

/** Smartbox-like DIRECT program, fully configured (synthetic — the shipped example-gifts partner stays mid-empty by invariant). */
const DIRECT_AWIN_PROGRAM: PartnerProgram = {
  network: "awin",
  awinMid: "11111",
  linkMode: "direct",
  urls: {
    fr: "https://www.smartbox.com/fr/fr/c/bien-etre",
    en: "https://www.smartbox.com/uk/c/wellness",
  },
};

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

  it("defaults the primary partner to Amazon (no longer hardcoded)", () => {
    expect(AFFILIATE_PRODUCTS["yoga-mat"]?.partner).toBe("amazon");
    // …but a product may unseat it (sample: Decathlon-led gear card).
    expect(AFFILIATE_PRODUCTS["fitness-bands"]?.partner).toBe("decathlon");
    // …and an unknown primary falls back to Amazon.
    expect(AFFILIATE_PRODUCTS["spa-robe"]?.partner).toBe("amazon");
  });

  it("resolves ctaKey with the shopCta default and honors overrides", () => {
    expect(AFFILIATE_PRODUCTS["yoga-mat"]?.ctaKey).toBe(DEFAULT_CTA_KEY);
    expect(AFFILIATE_PRODUCTS["yoga-mat"]?.ctaKey).toBe("affiliate.shopCta");
    // The gift card swaps "Acheter" for "Offrir" — gear and gift CTAs
    // coexist in one kit.
    expect(AFFILIATE_PRODUCTS["wellness-gift-voucher"]?.ctaKey).toBe(
      "affiliate.giftCta",
    );
  });

  it("resolves alts from the config array (0..n)", () => {
    expect(AFFILIATE_PRODUCTS["yoga-mat"]?.alts).toHaveLength(1);
    expect(AFFILIATE_PRODUCTS["yoga-mat"]?.alts[0]?.partner).toBe("decathlon");
    // The Decathlon-led card carries no alt (its primary collapsed there).
    expect(AFFILIATE_PRODUCTS["fitness-bands"]?.alts).toHaveLength(0);
    // Direct-mode card: no alts, no queries needed.
    expect(AFFILIATE_PRODUCTS["wellness-gift-voucher"]?.alts).toHaveLength(0);
    expect(AFFILIATE_PRODUCTS["wellness-gift-voucher"]?.queries).toBeUndefined();
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

  it("builds DIRECT-mode links as the fixed landing, without any query", () => {
    // Untracked destination (no publisher ids): the landing is used VERBATIM
    // — no searchPath, no query param, no search query appended, whatever
    // the query argument carries. (Fully-credentialed tags wrap it — that's
    // the tracker test below.)
    const dest = buildProgramLinkUrl(
      DIRECT_AWIN_PROGRAM,
      "should never appear",
      "fr",
      EMPTY_AFFILIATE_TAGS,
    );
    expect(dest).toBe("https://www.smartbox.com/fr/fr/c/bien-etre");

    // Per-locale landing: en shoppers get the en landing.
    expect(
      buildProgramLinkUrl(DIRECT_AWIN_PROGRAM, "x", "en", EMPTY_AFFILIATE_TAGS),
    ).toBe("https://www.smartbox.com/uk/c/wellness");
  });

  it("wraps DIRECT landings in the network trackers, keeping subids", () => {
    const awin = buildProgramLinkUrl(
      DIRECT_AWIN_PROGRAM,
      "x",
      "fr",
      AWIN_TAGS,
      { slot: "spa", placement: "guide-kit" },
    );
    const parsed = new URL(awin);
    expect(parsed.host).toBe("www.awin1.com");
    expect(parsed.pathname).toBe("/cread.php");
    expect(parsed.searchParams.get("awinmid")).toBe("11111");
    expect(parsed.searchParams.get("awinaffid")).toBe("54321");
    expect(parsed.searchParams.get("clickref")).toBe("spa-guide-kit");
    expect(parsed.searchParams.get("ued")).toBe(
      "https://www.smartbox.com/fr/fr/c/bien-etre",
    );
    // Only the four wrapper params — no query carried onto the landing.
    expect([...parsed.searchParams.keys()].sort()).toEqual([
      "awinaffid",
      "awinmid",
      "clickref",
      "ued",
    ]);

    const rakuten = buildProgramLinkUrl(
      {
        network: "rakuten",
        rakutenMid: "44806",
        linkMode: "direct",
        urls: { fr: "https://www.example-gifts.fr/bien-etre" },
      },
      "x",
      "fr",
      RAKUTEN_TAGS,
      { slot: "spa", placement: "guide-kit" },
    );
    const rparsed = new URL(rakuten);
    expect(rparsed.host).toBe("click.linksynergy.com");
    expect(rparsed.searchParams.get("id")).toBe("site-123");
    expect(rparsed.searchParams.get("u1")).toBe("spa-guide-kit");
    expect(rparsed.searchParams.get("murl")).toBe(
      "https://www.example-gifts.fr/bien-etre",
    );

    // Without publisher ids: the plain landing (buttons stay hidden by
    // gating — the untracked URL never ships).
    expect(
      buildProgramLinkUrl(DIRECT_AWIN_PROGRAM, "x", "fr", EMPTY_AFFILIATE_TAGS),
    ).toBe("https://www.smartbox.com/fr/fr/c/bien-etre");
  });

  it("lets a product-level url override the program landing per locale", () => {
    // A product that IS a single landing offer (one specific gift box).
    const override = buildProgramLinkUrl(
      DIRECT_AWIN_PROGRAM,
      "x",
      "fr",
      EMPTY_AFFILIATE_TAGS,
      undefined,
      { fr: "https://www.smartbox.com/fr/fr/e-coffre-duo-bien-etre" },
    );
    expect(override).toBe(
      "https://www.smartbox.com/fr/fr/e-coffre-duo-bien-etre",
    );

    // Per-locale fallback: a locale the product doesn't override keeps the
    // program's own landing.
    expect(
      buildProgramLinkUrl(DIRECT_AWIN_PROGRAM, "x", "en", EMPTY_AFFILIATE_TAGS, undefined, {
        fr: "https://www.smartbox.com/fr/fr/e-coffre-duo-bien-etre",
      }),
    ).toBe("https://www.smartbox.com/uk/c/wellness");
  });

  it("treats a DIRECT program without a locale landing as unavailable", () => {
    // Tracking ids are fine, but this program has no landing for en…
    const frOnly = { ...DIRECT_AWIN_PROGRAM, urls: { fr: DIRECT_AWIN_PROGRAM.urls?.fr } };
    expect(programAvailable(frOnly, "en", AWIN_TAGS)).toBe(false);
    // …while fr, which has one, is available.
    expect(programAvailable(frOnly, "fr", AWIN_TAGS)).toBe(true);

    // The name-based gate agrees (example-gifts has fr/en urls on its
    // program but no en PROGRAM at all).
    expect(partnerProgramAvailable("example-gifts", "fr", AWIN_TAGS)).toBe(false); // awinMid empty ⇒ hidden (invariant)
    expect(partnerProgramAvailable("example-gifts", "en", AWIN_TAGS)).toBe(false);

    // A direct program with an empty id stays hidden in EVERY locale —
    // same invariant as empty ids on search programs.
    expect(
      programAvailable({ ...DIRECT_AWIN_PROGRAM, awinMid: "" }, "fr", AWIN_TAGS),
    ).toBe(false);
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

  it("builds product links with Amazon default and gated alts", () => {
    const fr = buildProductLink(
      "yoga-mat",
      "fr",
      RAKUTEN_TAGS,
      undefined,
      { slot: "yoga-mat", placement: "guide-kit" },
    );
    expect(fr?.partner).toBe("amazon");
    expect(new URL(fr?.href ?? "").host).toBe("www.amazon.fr");
    expect(fr?.alts).toHaveLength(1);
    expect(fr?.alts[0]?.partner).toBe("decathlon");
    expect(new URL(fr?.alts[0]?.href ?? "").host).toBe("click.linksynergy.com");
    expect(new URL(fr?.alts[0]?.href ?? "").searchParams.get("u1")).toBe(
      "yoga-mat-guide-kit",
    );

    // Gating invariant: unavailable program ⇒ alt href emptied (button hidden).
    const de = buildProductLink("yoga-mat", "de", AWIN_TAGS);
    expect(de?.alts[0]?.href).toBe("");
  });

  it("honors the product primary override with the same gating as any partner", () => {
    // The Decathlon-led card leads with the wrapped Decathlon link in fr…
    const fr = buildProductLink("fitness-bands", "fr", RAKUTEN_TAGS);
    expect(fr?.partner).toBe("decathlon");
    expect(new URL(fr?.href ?? "").host).toBe("click.linksynergy.com");
    expect(fr?.alts).toHaveLength(0);

    // …and hides entirely in en (Decathlon has no program there — an
    // unconfigured primary never renders a dead button).
    const en = buildProductLink("fitness-bands", "en", RAKUTEN_TAGS);
    expect(en?.partner).toBe("decathlon");
    expect(en?.href).toBe("");

    // A partner override can still force Amazon on any card.
    const amazonOverride = buildProductLink(
      "fitness-bands",
      "en",
      RAKUTEN_TAGS,
      "amazon",
    );
    expect(new URL(amazonOverride?.href ?? "").host).toBe("www.amazon.com");
  });

  it("keeps the direct-mode gift card hidden until its program is configured", () => {
    // example-gifts ships awinMid: "" — the card must resolve to NO link.
    const fr = buildProductLink("wellness-gift-voucher", "fr", AWIN_TAGS);
    expect(fr?.href).toBe("");
    expect(fr?.alts).toHaveLength(0);
  });

  it("builds offer urls uniformly (buildOfferUrl)", () => {
    // Amazon offers always build.
    expect(
      buildOfferUrl({ partner: "amazon", queries: { fr: "tapis" } }, "fr", EMPTY_AFFILIATE_TAGS),
    ).toContain("www.amazon.fr");
    // Gated config partner ⇒ empty href.
    expect(
      buildOfferUrl({ partner: "example-gifts" }, "fr", AWIN_TAGS),
    ).toBe("");
  });

  it("narrows partner names against the config registry", () => {
    expect(isAffiliatePartner("amazon")).toBe(true);
    expect(isAffiliatePartner("decathlon")).toBe(true);
    expect(isAffiliatePartner("example-gifts")).toBe(true);
    expect(isAffiliatePartner("adsense")).toBe(false);
    expect(partnerLabel("amazon")).toBe("Amazon");
    expect(partnerLabel("decathlon")).toBe("Decathlon");
    expect(partnerLabel("example-gifts")).toBe("Example Gifts");
  });
});
