/**
 * ============================================================================
 *  DIRECTORY TEMPLATE — SINGLE INSTANTIATION CONFIG
 *
 *  ✏️  Edit this file to instantiate the template.
 *
 *  Everything a new directory must provide is declared HERE and nowhere else:
 *  brand, locales, entity vocabulary, sample taxonomy, affiliate programs and
 *  products, ad slots, editorial silos, scraping sources and seed cities.
 *  nuxt.config.ts and the shared/ engines consume this object — instantiating
 *  a niche should not require touching engine code.
 *
 *  Defaults ship a NEUTRAL sample directory (fitness / yoga / spa) with every
 *  tracking id empty, so nothing is monetized until it is configured:
 *  - empty affiliate program id   ⇒ partner button hidden (never uncredited)
 *  - empty AdSense client / slot  ⇒ ad unit renders nothing
 * ============================================================================
 */

/**
 * Locales the template ships locale metadata + translation files for
 * (i18n/locales/*.json). Activation is decided per instantiation by
 * `locales` below — inactive codes keep their files on disk but are not
 * routed, not in hreflang, not in the sitemap.
 */
export type ConfigLocale = "fr" | "en" | "de" | "es" | "it" | "pt";

/**
 * French-first localized string: `fr` is REQUIRED (default locale), any other
 * ConfigLocale key optional. Missing keys fall back to `en` then `fr` at
 * render time (see localizedCopy() in shared/affiliates.ts).
 */
export type LocalizedText = { fr: string } & Partial<Record<ConfigLocale, string>>;

export type PartnerNetwork = "rakuten" | "awin";

/** Per-locale merchant program of an affiliate partner. */
export interface PartnerProgram {
  network: PartnerNetwork;
  /** Merchant storefront host for this country (e.g. "www.decathlon.fr"). */
  host: string;
  /** Rakuten merchant id — informational (the deeplink needs the publisher site id). */
  rakutenMid?: string;
  /** Awin merchant id — REQUIRED to build a tracked Awin link. Empty ⇒ button hidden. */
  awinMid?: string;
  /** Search path on the storefront. Default: "/search". */
  searchPath?: string;
  /** Query-string parameter carrying the search query. Default: "Ntt" (Decathlon). */
  queryParam?: string;
}

/** One affiliate partner: display label + per-locale program map. */
export interface AffiliatePartnerConfig {
  /** Button/badge label (brand name). */
  label: string;
  /**
   * Program per locale. `undefined` / `null` ⇒ no program in that locale —
   * the partner button is NEVER rendered there, even with publisher ids
   * filled. A program becomes renderable only when its network's publisher
   * id (runtime env) AND its merchant id (awinMid) are non-empty.
   */
  programs: Partial<Record<ConfigLocale, PartnerProgram | null>>;
}

/** One affiliate product card, configured per instantiation. */
export interface AffiliateProductConfig {
  /** Stable id — referenced by the `kit` list and `::equipment-kit{items="…"}`. */
  id: string;
  /** Iconify icon rendered on the card (add it to the icon safelist in nuxt.config.ts). */
  icon: string;
  /** Card title per locale. */
  names: LocalizedText;
  /** One-line pitch per locale. */
  blurbs: LocalizedText;
  /** Search query for the DEFAULT partner (Amazon), per locale. */
  queries: LocalizedText;
  /**
   * Secondary partner offer rendered as an extra button on the SAME card.
   * Hidden entirely when that partner's program is not creditable in the
   * current locale (template invariant — see shared/affiliates.ts).
   */
  alt?: { partner: string; queries: LocalizedText };
}

/** Display vocabulary for a core entity, per locale. */
export interface EntityVocabulary {
  singular: LocalizedText;
  plural: LocalizedText;
}

/** One entry of the sample category taxonomy. */
export interface TaxonomyCategory {
  /** Canonical slug — portable identity, also the default-locale URL slug. */
  slug: string;
  /** Display labels per locale. */
  labels: LocalizedText;
}

export interface DirectoryConfig {
  /** Brand name (site.name, schema.org identity, page titles). */
  name: string;
  /** Canonical origin, no trailing slash (site.url, i18n.baseUrl, sitemap, CORS). */
  url: string;
  /** One-sentence pitch per locale — meta description + schema.org identity. */
  description: LocalizedText;
  /** Default locale — served WITHOUT a URL prefix (prefix_except_default strategy). */
  defaultLocale: ConfigLocale;
  /**
   * Active locales, in display order. First inactive-locale rule: every code
   * here must exist in I18N_LOCALE_META (nuxt.config.ts) and have a
   * i18n/locales/<code>.json file. fr MUST stay in the list (default locale).
   */
  locales: readonly ConfigLocale[];

  /**
   * Vocabulary for the two core entities — what future components call the
   * listed thing and its grouping (the template ships "venue" + "category").
   * Fill with the niche's words (e.g. club/serie, spot/spot-type…).
   */
  entity: {
    /** The listed item (a business / place). */
    venue: EntityVocabulary;
    /** The grouping the item belongs to. */
    category: EntityVocabulary;
  };

  /**
   * Sample category taxonomy — three neutral categories that exercise every
   * category-driven surface (hubs, filters, guides, sitemap).
   * ⚠ COUPLING: shared/activities.ts is neutralized to exactly these 3 slugs
   * (its catalog powers DB-matching helpers). When instantiating, replace the
   * categories HERE and in activities.ts together.
   */
  taxonomy: {
    categories: readonly TaxonomyCategory[];
  };

  /**
   * Affiliate monetization — programs, products, disclosure.
   * Mechanics (URL building, sub-tracking, availability gating) live in
   * shared/affiliates.ts and never need editing to change the DATA here.
   */
  affiliates: {
    /**
     * Mandatory disclosure shown next to every affiliate block
     * (FR: loi "confiance dans l'économie numérique"). The components read
     * the i18n key `affiliate.disclosure` — keep both in sync.
     */
    disclosure: LocalizedText;
    /**
     * Partner registry (Amazon is built-in as the DEFAULT destination and is
     * not listed here). Each entry: label + per-locale program map.
     * ⚠ Empty ids keep everything hidden until configured:
     *   - Rakuten program ⇒ set NUXT_PUBLIC_AFFILIATE_RAKUTEN_SITE_ID (env)
     *   - Awin program    ⇒ set NUXT_PUBLIC_AFFILIATE_AWIN_AFFID (env)
     *                       AND the program's awinMid here.
     * Decathlon ships as the EXAMPLE partner (one program per country, one
     * network per country — the pattern proven in production). Replace or
     * extend with the niche's merchants.
     */
    partners: Record<string, AffiliatePartnerConfig>;
    /**
     * SAMPLE products ("yoga mat", "spa robe", "fitness bands") — clearly
     * placeholder content. Replace with the niche's real gear; each product
     * needs its own per-locale search query per partner.
     */
    products: readonly AffiliateProductConfig[];
    /**
     * The ONE sample kit rendered by `::equipment-kit` (order matters).
     * Ids must exist in `products`. Reintroduce per-category kits by
     * extending resolveKitProductIds() in shared/affiliates.ts.
     */
    kit: readonly string[];
  };

  /**
   * Advertising (AdSense via @nuxt/scripts, first-party proxy). Empty values
   * ⇒ nothing loads and no ad slot renders.
   * Environment variables (runtime, override these defaults):
   * - NUXT_PUBLIC_ADSENSE_CLIENT                — "ca-pub-…" publisher id (also build-time: gates the script registry)
   * - NUXT_PUBLIC_ADSENSE_SLOT_HOME             — homepage leaderboard slot
   * - NUXT_PUBLIC_ADSENSE_SLOT_CATEGORIES_HUB   — categories-hub card slot
   * - NUXT_PUBLIC_ADSENSE_SLOT_CATEGORY_DETAIL  — category-hub in-article slot
   * (Slot env names renamed at template extraction: *_STYLES_HUB →
   * *_CATEGORIES_HUB, *_STYLE_DETAIL → *_CATEGORY_DETAIL.)
   */
  ads: {
    adsense: {
      client: string;
      slots: {
        home: string;
        categoriesHub: string;
        categoryDetail: string;
      };
    };
  };

  /**
   * Editorial content config.
   * siloTopics: per-niche editorial clusters for guides/blog planning.
   * PLACEHOLDER — the template ships none; fill during instantiation.
   * (Note: shared/silo.ts still hardcodes the spoke-type engine vocabulary.)
   */
  content: {
    siloTopics: readonly string[];
  };

  /**
   * Data acquisition.
   * sources: reference scraping adapters kept in the template. MUST match the
   * adapters' `meta.id` in server/services/scraping/sources/registry.ts —
   * the registry does not import this config (wiring it is a future step),
   * so keep the two in sync by hand.
   */
  scraping: {
    sources: readonly string[];
    /**
     * Major cities featured on cards with banner images
     * (/img/cities/<slug>.jpg). Alias handling (e.g. Lisboa → Lisbon) lives
     * in shared/major-eu-cities.ts.
     */
    seedCities: readonly string[];
  };
}

export const directoryConfig = {
  name: "Directory Template",
  url: "https://example-directory.com",
  description: {
    fr: "Annuaire de salles de sport en Europe : fitness, yoga et bien-être. Horaires, équipements et adresses pour trouver la salle qui vous correspond.",
    en: "A directory of sports venues across Europe: fitness, yoga and wellness. Schedules, equipment and locations to find the venue that suits you.",
  },
  defaultLocale: "fr",
  locales: ["fr", "en"],

  entity: {
    venue: {
      singular: { fr: "salle", en: "venue" },
      plural: { fr: "salles", en: "venues" },
    },
    category: {
      singular: { fr: "catégorie", en: "category" },
      plural: { fr: "catégories", en: "categories" },
    },
  },

  taxonomy: {
    categories: [
      { slug: "fitness", labels: { fr: "Fitness", en: "Fitness" } },
      { slug: "yoga", labels: { fr: "Yoga", en: "Yoga" } },
      { slug: "spa", labels: { fr: "Spa", en: "Spa" } },
    ],
  },

  affiliates: {
    disclosure: {
      fr: "Liens affiliés. Une commission peut être versée si vous achetez.",
      en: "Affiliate links. We may earn a commission if you buy.",
    },
    partners: {
      // EXAMPLE partner — per-country programs, one network each.
      decathlon: {
        label: "Decathlon",
        programs: {
          // Decathlon National (MID 44806) — Rakuten Advertising, 6%/sale.
          fr: { network: "rakuten", host: "www.decathlon.fr", rakutenMid: "44806" },
          // decathlon.com is the corporate site, not a storefront.
          en: null,
          // Awin — apply per country, then fill awinMid (empty ⇒ hidden).
          de: { network: "awin", host: "www.decathlon.de", awinMid: "" },
          es: { network: "awin", host: "www.decathlon.es", awinMid: "" },
          it: { network: "awin", host: "www.decathlon.it", awinMid: "" },
          pt: { network: "awin", host: "www.decathlon.pt", awinMid: "" },
        },
      },
    },
    // SAMPLE products — replace with the niche's gear when instantiating.
    products: [
      {
        id: "yoga-mat",
        icon: "i-lucide-sparkles",
        names: { fr: "Tapis de yoga", en: "Yoga mat" },
        blurbs: {
          fr: "Antidérapant, 4–6 mm : la base de toute séance.",
          en: "Non-slip, 4–6 mm: the base of every session.",
        },
        queries: { fr: "tapis de yoga antidérapant", en: "non slip yoga mat" },
        alt: {
          partner: "decathlon",
          queries: { fr: "tapis de yoga", en: "yoga mat" },
        },
      },
      {
        id: "spa-robe",
        icon: "i-lucide-droplets",
        names: { fr: "Peignoir de spa", en: "Spa robe" },
        blurbs: {
          fr: "Coton éponge absorbant, pour prolonger l'expérience du hammam à la maison.",
          en: "Absorbent terry cotton, to extend the hammam experience at home.",
        },
        queries: { fr: "peignoir coton éponge", en: "terry cloth bathrobe" },
        alt: {
          partner: "decathlon",
          queries: { fr: "peignoir de bain", en: "bathrobe" },
        },
      },
      {
        id: "fitness-bands",
        icon: "i-lucide-dumbbell",
        names: { fr: "Bandes élastiques", en: "Fitness bands" },
        blurbs: {
          fr: "Résistances variables pour s'échauffer ou se renforcer partout.",
          en: "Variable resistance for warm-ups or strength work anywhere.",
        },
        queries: { fr: "bandes élastiques fitness", en: "resistance bands set" },
        alt: {
          partner: "decathlon",
          queries: { fr: "bandes élastiques", en: "resistance band" },
        },
      },
    ],
    kit: ["yoga-mat", "spa-robe", "fitness-bands"],
  },

  ads: {
    adsense: {
      client: "",
      slots: {
        home: "",
        categoriesHub: "",
        categoryDetail: "",
      },
    },
  },

  content: {
    siloTopics: [
      // PLACEHOLDER — add per-niche editorial clusters, e.g.:
      // "beginner-guides", "equipment-guides", "city-guides"
    ],
  },

  scraping: {
    // Keep in sync with server/services/scraping/sources/registry.ts meta.id.
    sources: ["masalledesport", "fitnesspark"],
    seedCities: ["Paris", "Berlin", "London", "Barcelona", "Rome", "Lisbon"],
  },
} satisfies DirectoryConfig;

export default directoryConfig;
