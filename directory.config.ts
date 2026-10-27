/**
 * ============================================================================
 *  DIRECTORY TEMPLATE — SINGLE INSTANTIATION CONFIG
 *
 *  ✏️  Edit this file to instantiate the template.
 *
 *  Everything a new directory must provide is declared HERE and nowhere else:
 *  brand, locales, sample taxonomy, billing plans, affiliate programs and
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

/** One paid plan — Stripe product id + fallback pricing-table copy. */
export interface BillingPlan {
  /**
   * Stripe product id — MUST match the product created in the Stripe
   * dashboard. Checkout composes the price lookup keys
   * `${id}_monthly` / `${id}_yearly`; keep it a lowercase slug
   * (letters, digits, hyphens; underscore only when deliberate).
   */
  id: string;
  /** Card title in the pricing table. */
  title: string;
  /** One-line pitch shown under the title. */
  description: string;
  /** Display prices (monthly / yearly, in the Stripe account currency). */
  monthly: number;
  yearly: number;
  /** Mark as the highlighted "most popular" card (badge + emphasized CTA). */
  highlight?: boolean;
  /** Feature bullets listed on the card. */
  features: readonly string[];
}

/**
 * One entry of the category taxonomy — the SINGLE SOURCE for the editorial
 * catalog. shared/activities.ts derives its runtime structures (catalog,
 * aliases, families…) from these entries; never edit activities.ts by hand.
 */
export interface TaxonomyCategory {
  /** Canonical English slug — portable identity, also the default-locale URL slug. */
  slug: string;
  /** English canonical display name. */
  name: string;
  /** Display labels per locale (`en` should mirror `name`). */
  labels: LocalizedText;
  /** Localized URL slugs (a locale without an entry falls back to `slug`). */
  localeSlugs?: Partial<Record<ConfigLocale, string>>;
  /** Historical / env-specific primary slugs that still identify this category. */
  legacySlugs?: readonly string[];
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
   * here must exist in SHIPPED_LOCALES (shared/locale-meta.ts) and have a
   * i18n/locales/<code>.json file. fr MUST stay in the list (default locale).
   */
  locales: readonly ConfigLocale[];

  /**
   * Category taxonomy — the SINGLE SOURCE of truth for the editorial catalog.
   * shared/activities.ts derives ALL of its runtime data (ACTIVITY_CATALOG,
   * aliases, junk/alias-only sets, families, most-searched list, seed ids)
   * from these fields: instantiating a niche REPLACES taxonomy.* here and
   * touches no engine code. The sample data ships the three neutral
   * categories (fitness / yoga / spa) that exercise every category-driven
   * surface (hubs, filters, guides, sitemap).
   */
  taxonomy: {
    /** Canonical categories. Match DB rows via English `slug` — never by numeric id. */
    categories: readonly TaxonomyCategory[];
    /** Alias slug/name → canonical English slug (never listed as filter options). */
    aliases: Readonly<Record<string, string>>;
    /** Pure-alias slugs — excluded from filter lists when a canonical row exists. */
    aliasOnlySlugs: readonly string[];
    /** Known junk rows (venue names wrongly inserted as activities). */
    junkSlugs: readonly string[];
    /**
     * Discipline families for hub "similar categories" and mega-menu
     * descriptions (content-architecture.md §4.1). Not the navbar layout —
     * chrome is compact. `labelKey` values are i18n keys each instantiation
     * defines.
     */
    families: ReadonlyArray<{
      id: string;
      labelKey: string;
      categories: readonly string[];
    }>;
    /** Curated "most searched" categories for compact surfaces (data-backed by GSC category-query traffic). */
    mostSearched: readonly string[];
    /**
     * Fixed seed ids per canonical slug — for DBs created from fixed-ID
     * migrations ONLY (e.g. the scraping constants). Do NOT use for prod
     * identity: ids differ between local and prod.
     */
    seedIds: Readonly<Record<string, number>>;
  };

  /**
   * Affiliate monetization — programs, products, kit.
   * Mechanics (URL building, sub-tracking, availability gating) live in
   * shared/affiliates.ts and never need editing to change the DATA here.
   * The mandatory disclosure is TRANSLATABLE LEGAL COPY and lives ONLY in
   * the locale files (i18n key `affiliate.disclosure`) — never here.
   */
  affiliates: {
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
   * Billing — Stripe plan vocabulary. The plan ids here are the SINGLE
   * SOURCE for the session `plan` union (shared/types/auth.d.ts), the
   * fallback pricing table (app/composables/useStripe.ts) and the seeded
   * dev DB (server/db/seed.ts). Create Stripe products with EXACTLY these
   * ids and price lookup keys `${id}_monthly` / `${id}_yearly`.
   */
  billing: {
    /** Plan id of the free tier — never listed in `plans`, never checked out. */
    freePlanId: string;
    /** Paid plans, cheapest first (display order of the pricing table cards). */
    plans: readonly BillingPlan[];
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
   * siloSpokes: per-niche silo spoke vocabulary — the URL segments reserved
   * under /categories/<category>/<spoke> (shared/silo.ts derives its spoke
   * types, entry types and reserved slugs from this list). Labels live in
   * the i18n keys `guide.types.<slug>` — never in this config.
   */
  content: {
    siloSpokes: readonly string[];
  };

  /**
   * Data acquisition.
   * sources: ids of the ACTIVE scraping adapters. Adapters live as CODE in
   * server/services/scraping/sources/ (registered in registry.ts, ids
   * mirrored in sources/ids.ts) — this list only SELECTS which of them run:
   * the registry validates it at boot (unknown id ⇒ error) and
   * getAllSources() returns exactly this subset.
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

  taxonomy: {
    categories: [
      {
        slug: "fitness",
        name: "Fitness",
        labels: {
          fr: "Fitness",
          en: "Fitness",
          de: "Fitness",
          es: "Fitness",
          it: "Fitness",
          pt: "Fitness",
        },
        localeSlugs: {
          fr: "fitness",
          de: "fitness",
          es: "fitness",
          it: "fitness",
          pt: "fitness",
        },
      },
      {
        slug: "yoga",
        name: "Yoga",
        labels: {
          fr: "Yoga",
          en: "Yoga",
          de: "Yoga",
          es: "Yoga",
          it: "Yoga",
          pt: "Yoga",
        },
        localeSlugs: {
          fr: "yoga",
          de: "yoga",
          es: "yoga",
          it: "yoga",
          pt: "yoga",
        },
      },
      {
        slug: "spa",
        name: "Spa",
        labels: {
          fr: "Spa",
          en: "Spa",
          de: "Spa",
          es: "Spa",
          it: "Spa",
          pt: "Spa",
        },
        localeSlugs: {
          fr: "spa",
          de: "spa",
          es: "spa",
          it: "spa",
          pt: "spa",
        },
      },
    ],
    aliases: {
      // Fitness
      gym: "fitness",
      "salle-de-sport": "fitness",
      fitnessstudio: "fitness",
      // Yoga
      "hatha-yoga": "yoga",
      vinyasa: "yoga",
      // Spa
      wellness: "spa",
      "bien-etre": "spa",
    },
    aliasOnlySlugs: ["gym", "wellness"],
    junkSlugs: [],
    families: [
      {
        id: "wellness",
        labelKey: "nav.families.wellness",
        categories: ["fitness", "yoga", "spa"],
      },
    ],
    mostSearched: ["fitness", "yoga", "spa"] as const,
    seedIds: { fitness: 1, yoga: 2, spa: 3 } as const,
  },

  affiliates: {
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

  // SAMPLE pricing — neutral placeholder copy. Replace titles/descriptions/
  // features with the niche's offer; keep plan ids matching the Stripe
  // products created per instantiation (lowercase slug, used in lookup keys).
  billing: {
    freePlanId: "free",
    plans: [
      {
        id: "premium",
        title: "Premium",
        description: "Customize your venue page.",
        monthly: 9.99,
        yearly: 99.99,
        highlight: true,
        features: [
          "Add & customize venue page",
          "Propose event banners",
          "Manage venue information",
          "Update schedules & activities",
          "Upload venue images",
        ],
      },
      {
        id: "premium_pro",
        title: "Premium Pro",
        description: "Maximum control. Advanced features.",
        monthly: 19.99,
        yearly: 199.99,
        features: [
          "Everything in Premium",
          "Appointment & inscription section",
          "Coach listing & management",
          "Advanced analytics",
          "Priority support",
          "Custom branding options",
        ],
      },
    ] as const,
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
    siloSpokes: [
      "guide",
      "choisir-venue",
      "comparer",
      "tarifs",
      "equipement",
      "techniques",
    ] as const,
  },

  scraping: {
    // Active adapters — validated against sources/registry.ts at boot; the
    // instantiation contract test asserts coherence in the unit lane.
    sources: ["masalledesport", "fitnesspark"],
    seedCities: ["Paris", "Berlin", "London", "Barcelona", "Rome", "Lisbon"],
  },
} satisfies DirectoryConfig;

/** Ad slot placement names — derived from the configured AdSense slots. */
export type AdPlacement = keyof typeof directoryConfig.ads.adsense.slots;

export default directoryConfig;
