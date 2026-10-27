// https://nuxt.com/docs/api/configuration/nuxt-config

import { existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";

// Single instantiation surface — brand, locales, taxonomy, monetization.
// Edit directory.config.ts to instantiate the template; this file only wires it.
// Explicit .ts extensions: Node's native TS loader (NUXT_B5023) requires them
// for the files it loads directly (this one + content.config.ts).
import directoryConfig from "./directory.config.ts";
// Locale display metadata (BCP-47 tag, name, flag) for every translation file
// shipped in i18n/locales/ — single source of truth in shared/locale-meta.ts.
import { SHIPPED_LOCALES } from "./shared/locale-meta.ts";

// CSRF: nuxt-csurf uses its encryptSecret as a RAW aes-256-cbc key (exactly
// 32 bytes required) — any other length throws "Invalid key length" on every
// render, the csrf-token meta renders "undefined" and ALL form POSTs 403.
// Derive a stable 32-char string key from the env secret (Buffer.from(str)
// in uncsrf = 32 utf8 bytes) so any env secret length works.
const csrfEncryptKey = createHash("sha256")
  .update(process.env.CSRF_SECRET ?? "")
  .digest("hex")
  .slice(0, 32);

// v1 perf: prerender pure-content blog routes (active locales only). Blog
// pages are content-only — no DB data — so baking them at build time is
// freshness-safe. DB-coupled pages (categories hubs, city hubs, venues) stay
// SSR: their venue/city data changes daily via the scraper cron and must not
// freeze at deploy time. Default locale has no URL prefix (prefix_except_default).
const BLOG_LOCALE_PREFIXES: Record<string, string> = Object.fromEntries(
  directoryConfig.locales.map((locale) => [
    locale,
    locale === directoryConfig.defaultLocale ? "/blog" : `/${locale}/blog`,
  ]),
);

const blogPrerenderRoutes = Object.entries(BLOG_LOCALE_PREFIXES).flatMap(([locale, prefix]) => {
  const dir = `content/${locale}/blog`;
  if (!existsSync(dir)) return [prefix];
  const routes = [prefix];
  for (const file of readdirSync(dir)) {
    if (file.endsWith(".md") && !file.startsWith("_")) {
      routes.push(`${prefix}/${file.replace(/\.md$/, "")}`);
    }
  }
  return routes;
});

const umamiCspOrigin = (() => {
  const host =
    process.env.NUXT_UMAMI_HOST ||
    (process.env.NUXT_UMAMI_ENDPOINT ? new URL(process.env.NUXT_UMAMI_ENDPOINT).origin : null);
  if (!host) return null;
  try {
    return new URL(host.startsWith("http") ? host : `https://${host}`).origin;
  } catch {
    return null;
  }
})();

// Per-niche icon safelist — icons bound at runtime are invisible to the
// clientBundle scanner, so they must be listed here explicitly:
// - affiliate product icons are DERIVED from directoryConfig.affiliates
//   (.products[].icon, stored as UIcon names "i-<collection>-<name>" — the
//   safelist wants "<collection>:<name>" colon format);
// - the category icon map in app/components/venue/Card.vue
//   (getCategoryIcon()) is a hand-written runtime map and stays static.
const categoryIcons = [
  "lucide:map-pin",
  "lucide:flower-2",
  "lucide:waves",
  "lucide:music",
  "lucide:activity",
];
const affiliateProductIcons = directoryConfig.affiliates.products.map((product) =>
  product.icon.replace(/^i-/, "").replace("-", ":"),
);

export default defineNuxtConfig({
  compatibilityDate: "2025-06-03",
  future: {
    compatibilityVersion: 5,
  },
  modules: [
    "@nuxt/ui",
    "@nuxt/fonts",
    "@nuxt/image",
    "@nuxtjs/i18n",
    "@nuxtjs/seo",
    "@nuxt/content",
    "@comark/nuxt",

    "@nuxtjs/mcp-toolkit",
    "nuxt-auth-utils",
    "nuxt-authorization",
    "nuxt-security",
    // partytown removed (YGG-29): its only consumer was the CF Web Analytics
    // beacon; the worker's forwarding XHRs polluted the LCP window on prod.
    "@nuxt/scripts",

    "nuxt-umami",

    "@nuxt/eslint",
    "@unlok-co/nuxt-stripe",
    "motion-v/nuxt",
  ],
  fonts: {
    families: [
      // LCP-critical (YGG-29): PSI mobile showed the hero <h1> as the LCP
      // element with ~1 s "element render delay" — subsetted Google fonts are
      // excluded from automatic preloading (unicode-range), so the 700 face
      // was discovered only after entry.css parsed and the swap moved LCP
      // ~1 s past FCP. Emit <link rel="preload"> for exactly that face.
      // Manrope is the template's single family (display headings + body).
      {
        name: "Manrope",
        provider: "google",
        weights: [400, 500, 700],
        preload: { weights: [700], subsets: ["latin"], styles: ["normal"] },
      },
    ],
  },
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  app: {
    head: {
      // Per-instantiation: Google Search Console verification token for YOUR domain.
      meta: [{ name: "verification", content: "" }],
    },
  },

  // Bundle icons at build time so CSP does not need runtime calls to api.iconify.design
  icon: {
    clientBundle: {
      scan: true,
      // Safelist icons the scanner cannot reach (dynamic runtime bindings):
      // - getTransportIcon() in app/utils/icones.ts
      // - getCategoryIcon() in app/components/venue/Card.vue
      // - product icons in shared/affiliates.ts
      icons: [
        // Transport modes (getTransportIcon() in app/utils/icones.ts) — niche-neutral.
        "mdi:tram",
        "mdi:train",
        "mdi:bus",
        "mdi:subway-variant",
        "mdi:train-variant",
        "mdi:help-circle",
        // Category icon map in app/components/venue/Card.vue (getCategoryIcon()).
        ...categoryIcons,
        // Sample affiliate product icons (directoryConfig.affiliates.products).
        ...affiliateProductIcons,
      ],
    },
    // Resolve any icon from these collections server-side from the locally
    // installed @iconify-json/* packages. Covers unscannable dynamic names
    // (country flags i-flag:{code}-4x3, i18n nav icons, content MDC icons)
    // without calling api.iconify.design.
    serverBundle: {
      collections: ["heroicons", "lucide", "mdi", "flag", "ph"],
    },
  },

  // Google AdSense via Nuxt Scripts — first-party mode: the loader is bundled
  // from our domain at build time and ad requests are reverse-proxied through
  // Nitro at /_scripts/p/** with IP (subnet), language and hardware-fingerprint
  // anonymisation before reaching Google. Visitor browsers never open a direct
  // connection to Google for the loader/beacons (creative iframes inside ad
  // responses still come from Google hosts — hence the CSP entries below).
  // Activation is fully env-gated: without NUXT_PUBLIC_ADSENSE_CLIENT nothing
  // loads, no proxy route is registered, and <AdsAdUnit> renders nothing.
  scripts: {
    // Opaque aliases hide vendor hostnames in proxy paths: /_scripts/p/a1b2c3d4/…
    proxy: { alias: true },
    registry: {
      // NO partytown for the CF beacon: the worker's main-thread forwarding
      // fired 400+ /~partytown/proxytown XHRs during the LCP window on prod
      // (YGG-29 prod trace), inflating simulated FCP 1.05s → 4.7s. The beacon
      // is ~10KB and non-blocking by design — load it natively after hydration.
      cloudflareWebAnalytics: { trigger: "onNuxtReady" },
      googleAdsense: {
        client: process.env.NUXT_PUBLIC_ADSENSE_CLIENT || directoryConfig.ads.adsense.client,
        // Idle + 4s cap: the ~800 KB managed loader used to race the LCP image
        // for slow-4G bandwidth when fired at hydration (onNuxtReady ≈ 2-4 s on
        // mobile). requestIdleCallback only fires once the main thread is quiet,
        // so ads still load fast on desktop and after first paint on mobile.
        trigger: { idleTimeout: 4000 },
        autoAds: true,
        // Deliberately NO consent load-gate (useScriptTriggerConsent).
        // Google's CMP (Privacy & messaging → GDPR) delivers its consent
        // message THROUGH this tag: gating the tag behind consent stops
        // the message from ever rendering (chicken-and-egg). The tag
        // honours the TCF state itself — refusal ⇒ non-personalized or
        // no ads, no ad cookies. Only add a load-gate if migrating to a
        // third-party CMP that renders its own banner (docs/guides/consent
        // recipes): drop `trigger`, keep the registry entry
        // infrastructure-only, and call useScriptGoogleAdsense().load()
        // from the CMP's consent callback.
      },
    },
  },
  $development: {
    scripts: {
      registry: {
        googleAdsense: "mock",
        // TEMP (verification): CF mock lifted so partytown + token resolve in dev.
        // Restore 'mock' once verified, or keep — dev then sends real pings.
      },
    },
  },

  experimental: {
    nitroAutoImports: true,
    scanPageMeta: true,
  },
  nitro: {
    // Precompress static assets at build (.gz/.br): cold edge caches and any
    // non-compressing proxy between origin and CDN get compressed bytes, and
    // the node server serves them when Accept-Encoding allows.
    compressPublicAssets: { gzip: true, brotli: true },
    traceDeps: ["drizzle-orm*"],
    prerender: {
      routes: blogPrerenderRoutes,
    },
    storage: {
      redis: {
        driver: "redis",
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB,
      },
      // Nitro's cache layer (route-rule swr + cachedEventHandler) backed by
      // Redis so caches survive deploys instead of resetting with the process.
      // Entries are prefixed `cache:` — same db as app data is safe.
      cache: {
        driver: "redis",
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB,
      },
    },

    experimental: {
      tasks: true,
      database: true,
    },

    scheduledTasks: {
      // Run `cms:update` task every minute
      /*   "39 1/2 * * *": ["load:data"], */
      "0 3 * * *": "venues-multi-source",
      // Generate missing style content for fr/en daily at 4 AM
      // To add es/de/it later: run manually with { locales: ['es', 'de', 'it'] }
      "0 4 * * *": "generate-category-content",
      // Validate venue websites weekly on Sunday at 5 AM — nulls broken (4xx/5xx/timeout)
      "0 5 * * 0": "validate-venue-websites",
      // Enrich venues with AI descriptions from scraped website + Google Maps data
      // Processes up to 50 venues/day (those with website but no description)
      "0 6 * * *": "enrich-venues",
      // Catch-up geocoding for newly imported venue addresses (idempotent)
      "30 6 * * *": "geocode-addresses",
    },
  },
  runtimeConfig: {
    otp: {
      expiryMinutes: 10,
      maxAttempts: 5,
    },
    rateLimit: {
      requests: 3,
      window: 3600,
    },
    plunk: {
      apiKey: process.env.PLUNK_SECRET_API_KEY,
      baseUrl: process.env.PLUNK_BASE_URL,
      defaultFrom: process.env.PLUNK_DEFAULT_FROM,
    },
    geminiApiKey: process.env.GEMINI_API_KEY,
    scrapeApiKey: process.env.SCRAPE_API_KEY || "",
    // Geocoding provider chain (LocationIQ → GeoNames → Nominatim)
    locationiqApiKey: process.env.LOCATIONIQ_API_KEY,
    locationiqRegion: process.env.LOCATIONIQ_REGION || "eu1",
    geonamesUsername: process.env.GEONAMES_USERNAME,
    cookie: {
      httpOnly: true,
      // 'secure' omitted — h3 auto-detects from x-forwarded-proto header
      sameSite: "lax",
    },
    // Per-instantiation: Nuxt SEO Pro key (your domain's key from nuxtseo.com).
    seoProKey: "",
    csrfSecret: process.env.CSRF_SECRET,
    public: {
      affiliate: {
        // Amazon associate tags per storefront — leave empty until each
        // program is signed; empty ⇒ plain search URLs, no tag param.
        // (pt uses amazonTagPt on the amazon.es storefront — Amazon has no
        // Portuguese marketplace, but the associate program is per-locale.)
        amazonTagUs: process.env.NUXT_PUBLIC_AFFILIATE_AMAZON_TAG_US || "",
        amazonTagUk: process.env.NUXT_PUBLIC_AFFILIATE_AMAZON_TAG_UK || "",
        amazonTagFr: process.env.NUXT_PUBLIC_AFFILIATE_AMAZON_TAG_FR || "",
        amazonTagDe: process.env.NUXT_PUBLIC_AFFILIATE_AMAZON_TAG_DE || "",
        amazonTagEs: process.env.NUXT_PUBLIC_AFFILIATE_AMAZON_TAG_ES || "",
        amazonTagIt: process.env.NUXT_PUBLIC_AFFILIATE_AMAZON_TAG_IT || "",
        amazonTagPt: process.env.NUXT_PUBLIC_AFFILIATE_AMAZON_TAG_PT || "",
        // Awin publisher id — covers every Awin-network partner program
        // declared in directory.config.ts (affiliates.partners).
        awinAffid: process.env.NUXT_PUBLIC_AFFILIATE_AWIN_AFFID || "",
        // Rakuten publisher site id — covers every Rakuten-network partner
        // program (e.g. Decathlon France). Leave empty until approved: while
        // it is empty the partner button is not rendered, so no traffic goes
        // uncredited.
        rakutenSiteId: process.env.NUXT_PUBLIC_AFFILIATE_RAKUTEN_SITE_ID || "",
      },
      // AdSense — `client` mirrors the build-time env consumed by
      // scripts.registry.googleAdsense above (env overrides the
      // directory.config.ts default). Slot IDs come from ad units created in
      // the AdSense dashboard, one per placement. Empty value ⇒
      // <AdsAdUnit> renders nothing (same graceful degradation as the
      // affiliate partner buttons: never ship an unconfigured ad slot).
      adsense: {
        client: process.env.NUXT_PUBLIC_ADSENSE_CLIENT || directoryConfig.ads.adsense.client,
        slots: {
          home: process.env.NUXT_PUBLIC_ADSENSE_SLOT_HOME || directoryConfig.ads.adsense.slots.home,
          categoriesHub:
            process.env.NUXT_PUBLIC_ADSENSE_SLOT_CATEGORIES_HUB
            || directoryConfig.ads.adsense.slots.categoriesHub,
          categoryDetail:
            process.env.NUXT_PUBLIC_ADSENSE_SLOT_CATEGORY_DETAIL
            || directoryConfig.ads.adsense.slots.categoryDetail,
        },
      },
    },
  },
  routeRules: {
    // Prerendered at build time (pure content, freshness-safe).
    // NOTE: /blog/** without locale prefix only matches the fr (default) blog.
    ...Object.fromEntries(
      Object.values(BLOG_LOCALE_PREFIXES).flatMap((prefix) => [
        [prefix, { prerender: true }],
        [`${prefix}/**`, { prerender: true }],
      ]),
    ),
    // Cache-Control for Cloudflare: anonymous visitors (no session cookie —
    // enforced by the CF Cache Rule) get edge-cached HTML; logged-in traffic
    // bypasses to keep SSR personalization safe. CF ignores
    // stale-while-revalidate (its own serve-stale applies), browsers honor it.
    "/blog/**": {
      headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    },
    "/categories/**": {
      headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    },
    "/country/**": {
      headers: { "cache-control": "public, s-maxage=1800" },
    },
    // === Static assets ===
    // Emitted by the bundler with a content hash in the filename (entry.HASH.js),
    // so the bytes at a given URL can never change: safe to cache forever and skip
    // revalidation entirely.
    "/_nuxt/**": {
      headers: { "cache-control": "public, max-age=31536000, immutable" },
    },
    // Covers and blog images live at stable, *regenerable* URLs:
    // /img/cities/<slug>.jpg is rewritten by the generate-city-covers task and
    // /img/blog/<slug>.jpg by the article-cover generation, both overwriting the
    // same path. `immutable` would pin a regenerated cover in browsers and at the
    // Cloudflare edge for up to a year, so these are revalidated every 15 days:
    // long enough that a cover is served from cache ~always, short enough that a
    // regenerated one shows up within two Cloudflare TTLs.
    "/img/**": {
      headers: { "cache-control": "public, max-age=1296000" },
    },
    "/*/**": {
      ogImage: {
        component: "NuxtSeo.takumi",
      },
    },
    "/dashboard/**": { robots: false },
    "/admin/**": { robots: false },

    // === Security per-route rules ===
    // Auth endpoints — strict rate limiting
    "/api/auth/login": {
      security: {
        rateLimiter: {
          tokensPerInterval: 5,
          interval: 60_000,
          headers: true,
          throwError: true,
        },
      },
      // /api/auth/login stays CSRF-protected (default) — the csurf:false
      // workaround existed only while the encrypt key was broken.
    },
    "/admin/match-candidates": {
      redirect: { to: "/dashboard/admin/match-candidates", statusCode: 302 },
    },
    // Nuxt Scripts first-party proxy — relays third-party beacons (CF Web
    // Analytics /cdn-cgi/rum POSTs, AdSense pings). Those payloads carry no
    // nuxt-csurf token, and they are not user-initiated browser posts, so CSRF
    // validation is meaningless here and 403s every analytics event.
    // NOTE: key is `csurf` at routeRule top level — nuxt-csurf's middleware
    // reads getRouteRules(event).csurf directly (it never looks at
    // `security.csrf`, which is a different, unused config path).
    "/_scripts/**": {
      csurf: false,
    },
    "/_nitro/**": {
      csurf: false, // server-side task endpoint, driven via curl (see tasks/venues-multi-source.ts)
    },
    "/api/auth/signup": {
      security: {
        rateLimiter: {
          tokensPerInterval: 3,
          interval: 300_000,
          throwError: true,
        },
      },
    },
    "/api/auth/forgot-password": {
      security: {
        rateLimiter: {
          tokensPerInterval: 3,
          interval: 900_000,
          throwError: true,
        },
      },
    },
    "/api/auth/reset-password": {
      security: {
        rateLimiter: {
          tokensPerInterval: 5,
          interval: 300_000,
          throwError: true,
        },
      },
    },
    "/api/auth/verify-email": {
      security: {
        rateLimiter: {
          tokensPerInterval: 20,
          interval: 60_000,
          throwError: true,
        },
      },
      csurf: false, // GET endpoint, no CSRF needed
    },
    "/api/auth/resend-verification": {
      security: {
        rateLimiter: {
          tokensPerInterval: 3,
          interval: 900_000, // 15 minutes
          throwError: true,
        },
      },
    },
    // Public read APIs — exempt from global rate limit (SSR pages call these on every render)
    "/api/cities": { security: { rateLimiter: false } },
    "/api/cities/**": { security: { rateLimiter: false } },
    "/api/venues": { security: { rateLimiter: false } },
    "/api/venues/**": { security: { rateLimiter: false } },
    "/api/categories": { security: { rateLimiter: false } },
    "/api/categories/**": { security: { rateLimiter: false } },
    "/api/countries": { security: { rateLimiter: false } },
    "/api/countries/**": { security: { rateLimiter: false } },
    "/api/activities": { security: { rateLimiter: false } },
    "/api/equipments": { security: { rateLimiter: false } },
    // Webhooks — disable rate limiting (Stripe sends asynchronously)
    "/api/webhooks/**": {
      security: {
        rateLimiter: false,
        xssValidator: false,
      },
      csurf: false,
    },
    "/api/venues/scrape": {
      csurf: false,
    },
    // Nuxt Content query API — CSRF blocks content rendering
    "/__nuxt_content/**": {
      csurf: false,
    },
    "/api/savory": {
      csurf: false,
      security: {
        xssValidator: false,
        rateLimiter: false,
      },
    },
    // Admin task endpoints — CSRF disabled for CLI/dev access
    "/api/admin/tasks/**": {
      csurf: false,
    },
  },

  robots: {
    disallow: ["/dashboard", "/admin"],
    // Robots v7: block AI *training* crawlers (GPTBot, ClaudeBot,
    // Google-Extended, meta-externalagent, CCBot, Applebot-Extended, …) while
    // keeping AI *search* agents (OAI-SearchBot, ChatGPT-User, Claude-SearchBot,
    // PerplexityBot) allowed — training-lab exclusion without losing AI search
    // citations. Verified against installed robots v7: the 'training' value
    // switches the disallow group to the AiTrainingBots list only.
    blockAiBots: "training",
  },

  security: {
    strict: false,
    enabled: true,
    // Disable per-request nonce injection. CSP already allows 'unsafe-inline'
    // scripts/categories, so nonce adds no security — and the nonce value was not
    // propagating from the Nitro plugin to Unhead, emitting `nonce="undefined"`
    // on every <script>/<link> tag (invalid HTML, broke schema-org JSON-LD
    // body injection). See docs/seo/audit-2026-08-24.md finding #4.
    nonce: false,

    // === Security Headers (OWASP) ===
    headers: {
      strictTransportSecurity: {
        maxAge: 15_552_000,
        includeSubdomains: true,
      },
      xFrameOptions: "SAMEORIGIN",
      // Send origin to cross-origin venue websites so they can attribute FCF
      // referral traffic (partnership/link-building value). Path/query stripped
      // on downgrade, origin sent on same-origin — browser default behavior.
      referrerPolicy: "strict-origin-when-cross-origin",
      xContentTypeOptions: "nosniff",
      // COEP disabled: AdSense creative iframes (zrt_lookup.html, sodar
      // runner.html, ads?*) don't send COEP/CORP headers and get blocked
      // under both require-corp and credentialless (console: "each embedded
      // iframe must also specify this policy"). Nothing on the site needs
      // cross-origin isolation (no SharedArrayBuffer), so the header only
      // ever cost ad impressions. COOP (same-origin) stays — it isolates
      // browsing contexts, not embedded resources.
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        "base-uri": ["'none'"],
        "connect-src": [
          "'self'",
          "https://api.stripe.com",
          "https://maps.googleapis.com",
          "https://cloudflareinsights.com",
          // AdSense — loader/beacons are same-origin via the Nuxt Scripts proxy
          // (scripts.proxy), these cover dynamically-built requests that escape
          // the AST rewrite and Google's consent messaging (Privacy & messaging).
          "https://pagead2.googlesyndication.com",
          "https://fundingchoicesmessages.google.com",
          // sodar (traffic-quality) pings fired by show_ads_impl.js — ep2 as
          // fallback mirror of ep1 (both observed in AdSense/GPT CSP guidance).
          "https://ep1.adtrafficquality.google",
          "https://ep2.adtrafficquality.google",
          ...(umamiCspOrigin ? [umamiCspOrigin] : []),
        ],
        "font-src": ["'self'", "https:", "data:"],
        "form-action": ["'self'"],
        "frame-ancestors": ["'self'"],
        "frame-src": [
          "'self'",
          "https://js.stripe.com",
          "https://hooks.stripe.com",
          // AdSense creatives render in iframes from Google hosts (the proxy
          // rewrites loader/beacon URLs, not iframe srcs inside ad responses).
          // show_ads_impl.js injects the creative iframe itself with a src on
          // pagead2 (observed: "Blocked frame-src" console errors from
          // show_ads_impl.js — same origin as the connect-src entry above).
          "https://pagead2.googlesyndication.com",
          "https://googleads.g.doubleclick.net",
          "https://tpc.googlesyndication.com",
          "https://fundingchoicesmessages.google.com",
          "https://ep1.adtrafficquality.google",
          "https://ep2.adtrafficquality.google",
        ],
        "img-src": ["'self'", "data:", "https:"],
        "object-src": ["'none'"],
        "script-src-attr": ["'none'"],
        "style-src": ["'self'", "https:", "'unsafe-inline'"],
        "script-src": [
          "'self'",
          "'unsafe-inline'",
          "'wasm-unsafe-eval'",
          "https://js.stripe.com",
          "https://static.cloudflareinsights.com",
          // AdSense: main loader is bundled + proxied (same-origin), these are
          // safeframe/creative sub-scripts loaded from ad iframes and dynamic
          // fallbacks. If the console reports a blocked host after enabling,
          // add it here — AdSense origins shift occasionally.
          "https://pagead2.googlesyndication.com",
          "https://tpc.googlesyndication.com",
          "https://googleads.g.doubleclick.net",
          "https://fundingchoicesmessages.google.com",
          // sodar (traffic-quality) — show_ads_impl.js loads sodar2.js as a
          // <script> from ep2 (ep1 fallback) and pings it via connect-src.
          "https://ep1.adtrafficquality.google",
          "https://ep2.adtrafficquality.google",
          ...(umamiCspOrigin ? [umamiCspOrigin] : []),
        ],
        // Umami session replays (rrweb) use blob workers
        "worker-src": ["'self'", "blob:"],
        "upgrade-insecure-requests": true,
      },
      permissionsPolicy: {
        camera: [],
        geolocation: [],
        microphone: [],
        fullscreen: ["self"],
      },
    },

    // === Rate Limiting (Global - Redis driver for multi-instance) ===
    // 550 requests / 5 min / IP — enough for search crawlers (Googlebot uses many
    // IPs, each getting its own 550/5min bucket) without leaving the limit wide
    // open. Major search bots are not user-agent whitelisted (spoofable); they
    // rely on this per-IP limit. The NuxtSEOBot sentinel is whitelisted via the
    // allow-crawlers plugin.
    rateLimiter: {
      tokensPerInterval: 550,
      interval: 300_000,
      headers: true,
      driver: {
        name: "redis",
        options: {
          host: process.env.REDIS_HOST,
          port: Number(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD,
          db: Number(process.env.REDIS_DB) || 0,
        },
      },
      ipHeader: "cf-connecting-ip",
      // Whitelist sentinel set by the allow-crawlers plugin (server/plugins/allow-crawlers.ts):
      // verified NuxtSEO bots get cf-connecting-ip overridden to "nuxtseo-bot".
      // Other search crawlers (Googlebot, Bingbot, …) are NOT user-agent whitelisted
      // (spoofable) — they rely on the raised per-IP limit (550/5min) above, which is
      // plenty for any single crawler IP across a 3.5K-URL site.
      whiteList: ["nuxtseo-bot"],
      throwError: true,
    },

    // === Request Size Limits ===
    requestSizeLimiter: {
      maxRequestSizeInBytes: 2_000_000,
      maxUploadFileRequestInBytes: 8_000_000,
      throwError: true,
    },

    // === XSS Validation ===
    xssValidator: {
      methods: ["GET", "POST", "PUT", "PATCH"],
      throwError: true,
    },

    // === CORS ===
    corsHandler: {
      origin: directoryConfig.url,
      methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
      preflight: { statusCode: 204 },
    },

    // === Utils ===
    hidePoweredBy: true,
    removeLoggers: true,
    sri: true,

    // addCsrfTokenToEventCtx MUST stay false: nuxt-csurf's request-hook path
    // never populates event.context.csrfToken under nitro 3 beta, so the SSR
    // meta tag renders literally "undefined" and EVERY form POST fails with
    // 403 "CSRF Token invalid". The render:html branch computes the token
    // directly from the __Host-csrf cookie and works.
    csrf: { addCsrfTokenToEventCtx: false },
  },
  // nuxt-csurf top-level config (configKey "csurf"): feed the derived
  // 32-byte key — the module's own random default is base64 (44 chars),
  // which aes-256-cbc rejects outright.
  csurf: {
    enabled: true,
    encryptSecret: csrfEncryptKey,
    addCsrfTokenToEventCtx: false,
  },
  content: {
    build: {
      markdown: {
        // All fences in content are mermaid (rendered client-side via
        // ProsePre -> Mermaid.vue), so shiki syntax highlighting is dead weight.
        highlight: false,
      },
    },
  },
  // bgervan/nuxt-umami v3.4.0-bg.2 — https://github.com/bgervan/nuxt-umami
  // Build defaults: NUXT_UMAMI_HOST + NUXT_UMAMI_ID (or host/id below)
  // Runtime overrides (cloak): NUXT_UMAMI_WEBSITE + NUXT_UMAMI_ENDPOINT — no rebuild needed
  // Cloak POSTs /api/savory → Umami /api/send. Without payload.ip, Umami geolocates
  // the Hetzner VPS (cf-ipcountry=DE on that hop). The nuxt-umami patch stamps the
  // visitor from cf-connecting-ip onto payload.ip. Optional on Umami:
  // CLIENT_IP_HEADER=x-client-ip and SKIP_LOCATION_HEADERS=1.
  umami: {
    host: process.env.NUXT_UMAMI_HOST,
    id: process.env.NUXT_UMAMI_ID,
    autoTrack: true,
    ignoreLocalhost: process.env.NODE_ENV === "production",
    proxy: "cloak",
    logErrors: true,
    performance: true,
  },

  site: {
    url: directoryConfig.url,
    indexable: true,
    name: directoryConfig.name,
    description: directoryConfig.description.fr,
  },
  image: {
    format: ["webp", "avif"],
    quality: 80,
  },
  sitemap: {
    sources: ["/api/__sitemap__/urls"],
    exclude: ["/admin/**", "/dashboard/**", "/auth/**"],
    // Default is 10min; content cadence is ~daily (scraper cron 03:00, articles 12h+),
    // so 2h keeps the source/DB fetch and render cost at ~1× per window without
    // delaying new URLs meaningfully. Explicit number also guarantees the
    // sitemap:source-urls cache stays enabled (module gates it on this value).
    cacheMaxAgeSeconds: 60 * 60 * 2,
  },
  // OG Image v7 build cache (nuxtseo.com/docs/og-image/guides/build-cache):
  // prerendered OG images are stored under the module cache dir and reused
  // when props/template are unchanged. Helps repeated local builds; Coolify's
  // ephemeral Railpack builders start cold each deploy — runtime /_og/d/**
  // images stay Redis-cached via the nitro.storage.cache mount regardless.
  ogImage: {
    buildCache: true,
  },
  // Skew protection storage: keep previous client chunks in Redis so HTML cached
  // at the CF edge (s-maxage=3600) keeps working across deploys. The default fs
  // path lives in Railpack's node-modules cache mount — never baked into the
  // image — so the runtime container gets an empty store on Coolify.
  // Dedicated DB (REDIS_DB + 1) so flushing the shared app DB never wipes it.
  // Docs: nuxtseo.com/docs/skew-protection/guides/storage-configuration
  skewProtection: {
    storage: {
      driver: "redis",
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD,
      db: Number(process.env.REDIS_DB || 0) + 1,
      base: "skew-protection",
    },
  },
  aiReady: {
    // IndexNow key — MUST be the key string, not a boolean. The module serves
    // it at /{key}.txt which Bing validates on every submission; a boolean
    // produced key "true" → /true.txt 404 → every batch silently rejected.
    // Per-instantiation: generate a fresh IndexNow key for YOUR domain.
    indexNow: "REPLACE-ME-PER-INSTANTIATION",
    // Registers the ai-ready:cron Nitro task + module's own */5 schedule
    // (fast-path: exits early when no pending work).
    cron: true,
    // Nuxt SEO v6 bundles AI Ready v3, which negotiates Markdown via the
    // Accept header only — AI crawlers no longer get Markdown from their
    // User-Agent alone. Restore the v1 behavior (GPTBot/ClaudeBot et al.
    // receive .md directly).
    botNegotiation: true,
    // IETF content-signals (robots.txt Content-Signal line): search and AI
    // input (RAG/grounding) allowed, training NOT — mirrors robots.blockAiBots:
    // 'training' so signal consumers and UA-based blockers say the same thing.
    // Left-out keys are emitted as `no` per the module contract.
    contentSignal: {
      aiTrain: false,
      search: true,
      aiInput: true,
    },
  },
  schemaOrg: {
    identity: {
      type: "Organization",
      name: directoryConfig.name,
      url: directoryConfig.url,
      description: directoryConfig.description.fr,
    },
  },
  i18n: {
    baseUrl: directoryConfig.url,
    strategy: "prefix_except_default",
    defaultLocale: directoryConfig.defaultLocale,
    langDir: "../i18n/locales",
    experimental: {
      nitroContextDetection: false,
      // strictSeo: auto-inject hreflang alternates + og:locale for all ACTIVE
      // locales (directoryConfig.locales). Without it, NO hreflang is emitted
      // and Google picks its own canonical, merging distinct categories
      // across locales.
      strictSeo: true,
    },

    // Disable browser-language detection/redirect — causes canonical mismatches when Googlebot
    // (sending Accept-Language) gets redirected to locale-prefixed URLs that don't match declared
    // canonicals. The manual locale switcher in the header handles UX; hreflang covers SEO.
    detectBrowserLanguage: false,
    // Active subset of SHIPPED_LOCALES (shared/locale-meta.ts) — inactive
    // locales keep their translation files on disk but are not routed.
    // file: each shipped locale maps 1:1 to i18n/locales/<code>.json.
    locales: directoryConfig.locales.map((code) => ({
      code,
      file: `${code}.json`,
      language: SHIPPED_LOCALES[code].language,
      name: SHIPPED_LOCALES[code].name,
    })),
  },
});
