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
  /**
   * Merchant storefront host for this country (e.g. "www.decathlon.fr").
   * SEARCH-mode programs only — DIRECT programs link to `urls` and don't
   * need a host.
   */
  host?: string;
  /** Rakuten merchant id — informational (the deeplink needs the publisher site id). */
  rakutenMid?: string;
  /** Awin merchant id — REQUIRED to build a tracked Awin link. Empty ⇒ button hidden. */
  awinMid?: string;
  /**
   * How links are built for this program. Default "search": storefront host
   * + searchPath + per-product query. "direct": ONE fixed landing URL per
   * locale — no search at all (gift-experience vouchers, category landings…).
   *
   * Example (direct partner, Awin):
   * ```
   * {
   *   network: "awin",
   *   awinMid: "12345",            // empty ⇒ hidden until configured
   *   linkMode: "direct",
   *   urls: {
   *     fr: "https://www.smartbox.com/fr/fr/c/bien-etre",
   *     en: "https://www.smartbox.com/uk/c/wellness",
   *   },
   * }
   * ```
   * RULE: a direct partner with NO url for a locale is treated as
   * unavailable in that locale (button hidden — same invariant as empty
   * ids: never ship a half-configured partner).
   */
  linkMode?: "search" | "direct";
  /** DIRECT programs: fixed landing URL per locale (see linkMode). */
  urls?: Partial<Record<ConfigLocale, string>>;
  /** SEARCH programs: search path on the storefront. Default: "/search". */
  searchPath?: string;
  /** SEARCH programs: query-string parameter. Default: "Ntt" (Decathlon). */
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
  /**
   * Partner of the PRIMARY button: "amazon" (default) or a key of
   * `affiliates.partners`. Amazon is NOT forced — a gift card can lead with
   * a voucher partner while a gear card keeps Amazon/Decathlon. A
   * config-partner primary obeys the same gating as any partner button
   * (unconfigured/absent program in the locale ⇒ button hidden).
   */
  primary?: string;
  /**
   * Search query per locale. REQUIRED when the resolved partner (primary or
   * alt) is search-mode; unused for direct partners.
   */
  queries?: LocalizedText;
  /**
   * Product-level direct landing URL per locale — for a product that IS a
   * single landing offer (e.g. one specific gift box) rather than a
   * partner-search. Overrides the partner program's `urls` per locale for
   * direct partners; ignored for search partners.
   */
  urls?: Partial<Record<ConfigLocale, string>>;
  /**
   * Secondary partner offers rendered as extra buttons on the SAME card
   * (0..n — e.g. Decathlon next to Amazon, or Amazon next to a voucher
   * partner). Each is hidden when its partner's program is not creditable
   * in the current locale (template invariant — see shared/affiliates.ts).
   */
  alts?: ReadonlyArray<{
    partner: string;
    queries?: LocalizedText;
    urls?: Partial<Record<ConfigLocale, string>>;
  }>;
  /**
   * i18n key of the primary button label. Default "affiliate.shopCta"
   * ("Acheter"/"Shop") — override per product so gear ("Acheter") and gift
   * ("Offrir") cards can coexist in one kit.
   */
  ctaKey?: string;
}

/**
 * One outbound booking partner of the venue-detail booking CTA — the niche's
 * booking platforms (e.g. Playtomic for padel) whose venue pages the
 * directory deep-links to. Matched against a venue's `booking_url` (by
 * `booking_partner` id first, then by host suffix) to pick the CTA label and
 * rel; `sponsored` marks a commercial partnership (rel + disclosure).
 */
export interface BookingPartnerConfig {
  /** Stable id — the value stored in the venues `booking_partner` column. */
  id: string;
  /** CTA label per locale (fr required — same LocalizedText fallback as everywhere). */
  label: LocalizedText;
  /**
   * Host suffixes identifying the partner's booking pages — "playtomic.com"
   * matches "venues.playtomic.com" and "playtomic.com" (www stripped).
   */
  hosts: readonly string[];
  /**
   * True ⇒ the CTA is a monetized/sponsored placement: rel="sponsored
   * noopener noreferrer" + the `affiliate.disclosure` string rendered next
   * to the button. False ⇒ plain outbound link (rel="noopener").
   */
  sponsored: boolean;
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
  /**
   * Feature bullets listed on the pricing card. PER-NICHE MARKETING COPY —
   * config-owned like title/description (each instantiation writes its own),
   * NOT i18n: these strings ship as-is in every locale.
   */
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
  /**
   * Iconify icon shown on category cards (venue cards, hubs), carried through
   * the catalog derivation (shared/activities.ts). Format "i-<collection>-<name>";
   * the icon must be safelisted — nuxt.config.ts derives the safelist from
   * this field. Unset ⇒ cards fall back to the generic keyword icon map.
   */
  icon?: string;
  /**
   * Open per-niche metadata slot (future waves consume it) — free-form, no
   * engine semantics in the template. Keep it JSON-serializable.
   */
  meta?: Record<string, unknown>;
}

/**
 * One venue attribute facet — a config-declared structured attribute of the
 * venues.attributes JSONB column. `key` is the JSONB key AND the i18n label
 * key fragment (`facet.<key>`, plus `facet.<key>.<value>` for enum values).
 */
/**
 * City-page URL pattern — the SEO hub-chain shape of an instantiation.
 * - 'country-city-category': chained hubs — city hub at /<country>/<city>,
 *   category × city at /<country>/<city>/<category> (e.g. /france/paris/spa —
 *   country-first chain, deep silo). The legacy /country/** URLs 301 to it.
 * - 'category-city': the pre-existing shape — city hub at
 *   /country/<country>/<city>, category × city at /categories/<category>/<city>.
 * All chain URLs are built through shared/city-chain.ts (single source); the
 * redirect middleware flips with this flag. The filter-driven /venues search
 * stays the complementary browse surface in both modes (not part of the chain).
 */
export type CityUrlPattern = "country-city-category" | "category-city";

export interface FacetConfig {
  /** JSONB key of venues.attributes (also the i18n `facet.<key>` fragment). */
  key: string;
  /**
   * boolean ⇒ the value is `true`/absent (a `false` is meaningless: the chip
   * only renders when true, the filter only matches true). enum ⇒ the value
   * is one of `values`.
   */
  kind: "boolean" | "enum";
  /**
   * Enum vocabulary — REQUIRED for kind: "enum" (≥1 value, enforced by the
   * instantiation contract test) and forbidden noise on booleans. Values are
   * whitelisted for filtering AND rendering: unknown keys/values in venue
   * data are never rendered.
   */
  values?: readonly string[];
  /**
   * false ⇒ display-only chip on the venue page (no filter control, not
   * accepted as an API filter). Default true.
   */
  filterable?: boolean;
  // Number facets are deliberately OUT of this engine: per-venue prices live
  // in the `formulas` table (name + price + period), not in attributes.
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
    /**
     * Venue attribute facets — per-niche structured attributes carried by the
     * venues.attributes JSONB column (SINGLE SOURCE for the public chips, the
     * filter controls and the API filter whitelist):
     * - key = venues.attributes JSONB key; i18n labels are `facet.<key>`
     *   (chip label) and `facet.<key>.<value>` (enum value labels) — every
     *   active locale must define them (contract test).
     * - kind "boolean" renders/filters `true` only; kind "enum" REQUIRES
     *   `values` (whitelisted) — number facets are OUT (prices live in the
     *   formulas table).
     * - filterable: false ⇒ display-only chip, no filter control.
     * - Unknown keys in venue data are never rendered (config-declared keys only).
     * SAMPLE below — per-niche replace (padel: indoor/outdoor, court count…;
     * spa: privatif, hébergement, capacité…).
     */
    facets: readonly FacetConfig[];
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
   * Outbound booking CTA on venue detail. Venues carry `booking_url` (their
   * Playtomic / booking-platform page or their own booking system) and an
   * optional `booking_partner`; partners are matched by id first, then by
   * host suffix of the URL, to decide label + rel:
   * - matched partner with `sponsored: true` ⇒ rel="sponsored noopener
   *   noreferrer" + the `affiliate.disclosure` i18n string adjacent to the
   *   CTA (commercial partnership — same legal regime as affiliate links);
   * - unmatched URL ⇒ plain outbound link (rel="noopener");
   * - empty `partners` (the shipped default) ⇒ every booking link is plain.
   * No booking_url ⇒ the CTA renders nothing (unconfigured ⇒ hidden).
   */
  booking: {
    /** Booking partner registry — empty by default (plain CTAs only). */
    partners: readonly BookingPartnerConfig[];
  };

  /**
   * Billing — Stripe plan vocabulary. The plan ids here are the SINGLE
   * SOURCE for the session `plan` union (shared/types/auth.d.ts), the
   * fallback pricing table (app/composables/useStripe.ts) and the seeded
   * dev DB (server/db/seed.ts). Create Stripe products with EXACTLY these
   * ids and price lookup keys `${id}_monthly` / `${id}_yearly`.
   */
  billing: {
    /**
     * ISO 4217 currency code of the Stripe account ("EUR", "USD", …) — used
     * by the pricing-table formatter (app/composables/useStripe.ts,
     * Intl.NumberFormat) and must match the currency of the Stripe prices.
     */
    currency: string;
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
   * - NUXT_PUBLIC_ADSENSE_SLOT_VENUE_DETAIL     — venue-detail bottom slot
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
        venueDetail: string;
      };
    };
  };

  /**
   * Editorial content config.
   * siloSpokes: per-niche silo spoke vocabulary — the URL segments reserved
   * under /categories/<category>/<spoke> (shared/silo.ts derives its spoke
   * types, entry types and reserved slugs from this list). Labels live in
   * the i18n keys `guide.types.<slug>` — never in this config.
   * pillarPaths: per-locale path of the pillar article linked from the home
   * hero CTA and the footer guides column (SAMPLE paths below point at the
   * template's sample blog posts — replace with the niche's own pillar).
   * A locale WITHOUT an entry ⇒ the links are hidden there (no cross-locale
   * fallback: a fr page never links to the en article).
   */
  content: {
    siloSpokes: readonly string[];
    pillarPaths: Partial<Record<ConfigLocale, string>>;
    /**
     * City-page URL pattern — see {@link CityUrlPattern}. Sample value ships
     * the country-first chain ('country-city-category', e.g. /france/paris/spa);
     * flip to 'category-city' to restore the pre-existing /country/** +
     * /categories/** shape. URL building (shared/city-chain.ts), the redirect
     * middleware and the sitemap emission all derive from this value.
     */
    cityUrlPattern: CityUrlPattern;
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
     * Name-keyword reject list applied at ingest: a scraped place whose name
     * CONTAINS one of these (lowercased) substrings is skipped entirely.
     * SAMPLE — per-niche replace; spa/padel sites likely want [] (the shipped
     * fitness-flavoured list rejects 'beauty'/'salon', which would silently
     * delete legitimate spa venues). Empty array ⇒ ingest keeps everything.
     */
    rejectNameKeywords: readonly string[];
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
        icon: "i-lucide-dumbbell",
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
        icon: "i-lucide-flower-2",
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
        icon: "i-lucide-droplets",
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

    // SAMPLE facets — per-niche replace (see the taxonomy.facets JSDoc).
    // i18n labels: i18n key family `facet.*` (facet.<key> + facet.<key>.<value>).
    facets: [
      { key: "group-classes", kind: "boolean", filterable: true },
      { key: "open-sundays", kind: "boolean", filterable: true },
      { key: "ambiance", kind: "enum", values: ["family", "performance", "relaxed"], filterable: true },
    ] as readonly FacetConfig[],
  },

  affiliates: {
    /**
     * Partner registry (Amazon is built-in but NOT forced as primary — each
     * product picks its `primary`, defaulting to amazon). Each entry: label
     * + per-locale program map. Programs are "search" mode (storefront
     * search, default) or "direct" mode (one fixed landing URL per locale —
     * gift vouchers, category landings; see PartnerProgram.linkMode).
     * ⚠ Empty ids keep everything hidden until configured:
     *   - Rakuten program ⇒ set NUXT_PUBLIC_AFFILIATE_RAKUTEN_SITE_ID (env)
     *   - Awin program    ⇒ set NUXT_PUBLIC_AFFILIATE_AWIN_AFFID (env)
     *                       AND the program's awinMid here.
     *   - Direct program  ⇒ ALSO a `urls` entry for the locale (missing url
     *                       in a locale ⇒ hidden there, same invariant).
     * Decathlon ships as the EXAMPLE search partner (one program per
     * country, one network per country — the pattern proven in production);
     * example-gifts is the EXAMPLE direct partner (gift-voucher shape).
     * Replace or extend with the niche's merchants.
     */
    partners: {
      // EXAMPLE search partner — per-country programs, one network each.
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
      // EXAMPLE direct partner — gift-experience vouchers (Smartbox/Wonderbox
      // shape): one fixed landing per locale, no storefront search. awinMid
      // empty ⇒ stays HIDDEN until the program is configured (invariant).
      "example-gifts": {
        label: "Example Gifts",
        programs: {
          fr: {
            network: "awin",
            awinMid: "",
            linkMode: "direct",
            urls: {
              fr: "https://www.example-gifts.fr/bien-etre",
              en: "https://www.example-gifts.com/wellness",
            },
          },
          en: null,
        },
      },
    },
    // SAMPLE products — replace with the niche's gear/gifts when
    // instantiating. Search-shaped products need `queries`; direct products
    // (primary on a linkMode:"direct" partner) need none. `ctaKey` swaps the
    // button label per product so gear ("Acheter") and gift ("Offrir") cards
    // coexist in one kit.
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
        alts: [
          {
            partner: "decathlon",
            queries: { fr: "tapis de yoga", en: "yoga mat" },
          },
        ],
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
        alts: [
          {
            partner: "decathlon",
            queries: { fr: "peignoir de bain", en: "bathrobe" },
          },
        ],
      },
      {
        id: "fitness-bands",
        icon: "i-lucide-dumbbell",
        // primary override demo — this card LEADS with Decathlon instead of
        // Amazon (Decathlon hidden in en: no program there).
        primary: "decathlon",
        names: { fr: "Bandes élastiques", en: "Fitness bands" },
        blurbs: {
          fr: "Résistances variables pour s'échauffer ou se renforcer partout.",
          en: "Variable resistance for warm-ups or strength work anywhere.",
        },
        queries: { fr: "bandes élastiques fitness", en: "resistance bands set" },
      },
      {
        id: "wellness-gift-voucher",
        icon: "i-lucide-gift",
        // Direct-mode demo — leads with a gift-voucher partner, "Offrir" CTA.
        // Hidden everywhere until example-gifts' awinMid is configured.
        primary: "example-gifts",
        ctaKey: "affiliate.giftCta",
        names: { fr: "Bon cadeau bien-être", en: "Wellness gift voucher" },
        blurbs: {
          fr: "Offrez une parenthèse : spa, massage ou sauna en coffret cadeau.",
          en: "Give a wellness escape: spa, massage or sauna in a gift box.",
        },
      },
    ],
    kit: ["yoga-mat", "spa-robe", "fitness-bands", "wellness-gift-voucher"],
  },

  // Booking partners — EMPTY by default: venue booking links (venues
  // booking_url/booking_partner columns) render as plain outbound CTAs until
  // the niche's booking platforms are configured here. Fill with entries
  // shaped like:
  //   { id: "playtomic", label: { fr: "Réserver sur Playtomic" },
  //     hosts: ["playtomic.com"], sponsored: true }
  booking: {
    partners: [] as readonly BookingPartnerConfig[],
  },

  // SAMPLE pricing — neutral placeholder copy. Replace titles/descriptions/
  // features with the niche's offer; keep plan ids matching the Stripe
  // products created per instantiation (lowercase slug, used in lookup keys).
  billing: {
    currency: "EUR",
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
        venueDetail: "",
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
    // SAMPLE pillar paths — the template's sample blog articles. Replace with
    // the niche's own pillar post per locale; drop a locale's entry to hide
    // the hero CTA + footer link in that locale.
    pillarPaths: {
      fr: "/blog/annuaire-niche-vs-marketplace",
      en: "/blog/niche-directory-vs-marketplace",
    },
    // Chained country-first hubs (/france/paris + /france/paris/spa). Flip to
    // 'category-city' to restore /country/{country}/{city} +
    // /categories/{category}/{city} (legacy URLs keep 301ing either way).
    cityUrlPattern: "country-city-category",
  },

  scraping: {
    // Active adapters — validated against sources/registry.ts at boot; the
    // instantiation contract test asserts coherence in the unit lane.
    // "osm-overpass" is the registered JSON no-browser reference archetype —
    // it stays unselected by default; enable it for a niche by uncommenting:
    // sources: ["masalledesport", "fitnesspark", "osm-overpass"],
    sources: ["masalledesport", "fitnesspark"],
    // SAMPLE reject list (fitness-flavoured) — see the field JSDoc above.
    rejectNameKeywords: [
      "nails", "hair", "beauty", "salon", "coiffure", "ongle",
      "tattoo", "piercing",
      "pharmacy", "apotheken", "restaurant", "cafe", "bar ",
    ],
    // The 30 shipped banner cities (public/img/cities/<slug>.jpg), in
    // server/db/data/major-cities-population.ts order — biggest city per
    // supported market. MUST stay ⊆ the banner file set (unit contract test
    // asserts every entry has its banner; localized display names live in
    // i18n/locales/*.json `eu_city_names`).
    seedCities: [
      // France — top 10
      "Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes",
      "Montpellier", "Strasbourg", "Bordeaux", "Lille",
      // Germany
      "Berlin", "Hamburg", "Munich", "Cologne",
      // United Kingdom
      "London", "Birmingham", "Glasgow",
      // Spain / Italy
      "Madrid", "Barcelona", "Valencia", "Rome", "Milan", "Naples",
      // Netherlands / Belgium / Austria / Switzerland
      "Amsterdam", "Brussels", "Vienna", "Zurich",
      // Portugal
      "Lisbon", "Porto",
      // Réunion
      "Saint-Denis",
    ],
  },
} satisfies DirectoryConfig;

/** Ad slot placement names — derived from the configured AdSense slots. */
export type AdPlacement = keyof typeof directoryConfig.ads.adsense.slots;

export default directoryConfig;
