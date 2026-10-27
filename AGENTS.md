# Directory Template — AGENTS.md

**Updated:** 2026-10-27 | **Origin:** extracted by subtraction from `~/project/yggdraz/fight-club-finder` (FCF, martial-arts clubs directory)

## Project Overview

Reusable **directory app template**. Neutral sample niche (fitness / yoga / spa venues, Europe), French-first bilingual site (fr/en verified; de/es/it/pt unverified drafts — see `i18n/README.md`).
Stack: **Nuxt 4 + Nuxt UI v4 + Drizzle ORM (PostgreSQL) + nuxt-auth-utils + Stripe + Nuxt Content v3**. Zod v4, Vercel AI SDK v6, Redis storage, nuxt-security, @nuxtjs/seo.

Instantiate (not develop) the template by editing **`directory.config.ts`** — see the instantiation contract below. Engine code (components, server layer, services) is niche-neutral and should not need edits for a new niche.

## Instantiation Contract — `directory.config.ts`

Single config file everything reads: `nuxt.config.ts` (site/i18n/SEO/schema.org/AdSense defaults) and the `shared/` engines. Defaults ship a neutral sample directory with **every tracking/monetization id empty** (unconfigured ⇒ hidden). Every field:

| Field | Purpose |
|---|---|
| `name`, `url`, `description` | Brand name, canonical origin (no trailing slash), per-locale one-sentence pitch (meta description + schema.org identity) |
| `defaultLocale`, `locales` | Default locale served WITHOUT URL prefix (`prefix_except_default`); fr MUST stay in the list. Codes must exist in `SHIPPED_LOCALES` (`shared/locale-meta.ts`) with an `i18n/locales/<code>.json` file and a `content/<code>/` directory |
| `taxonomy.*` | Category taxonomy — SINGLE SOURCE for the editorial catalog (categories with slug/name/labels/localeSlugs/legacySlugs, aliases, alias-only + junk slugs, families, mostSearched, seedIds). `shared/activities.ts` derives everything from it — never edit that file by hand |
| `affiliates` | `partners` (per-locale program map; Decathlon ships as EXAMPLE), `products` (sample gear cards), `kit` (ids rendered by `::equipment-kit`). The mandatory affiliate disclosure is NOT configured here — locale files (i18n key `affiliate.disclosure`) are its only source |
| `billing` | Stripe plan vocabulary: `freePlanId` + `plans[]` (`id`, `title`, `description`, `monthly`, `yearly`, `highlight`, `features`). Plan ids single-source the session `plan` type (`shared/types/auth.d.ts`), the fallback pricing table (`app/composables/useStripe.ts`) and the seeded dev DB (`server/db/seed.ts`). Create Stripe products with exactly these ids and price lookup keys `${id}_monthly` / `${id}_yearly` |
| `ads.adsense` | `client` + `slots` (`home`, `categoriesHub`, `categoryDetail`); env overrides; empty ⇒ nothing renders |
| `content.siloSpokes` | Per-niche silo spoke URL segments (labels live in i18n `guide.types.<slug>`; sample values: `guide`/`choisir-venue`/`comparer`/`tarifs`/`equipement`/`techniques` — neutral placeholder vocabulary) |
| `scraping.sources` | Ids of the ACTIVE adapters — `server/services/scraping/sources/registry.ts` validates them at boot (unknown id ⇒ error) and `getAllSources()` returns exactly this subset; adapter ids are mirrored in `sources/ids.ts` for the unit contract test |
| `scraping.seedCities` | Cities featured with banner images (`/img/cities/<slug>.jpg`) |

### Instantiation workflow

1. Copy `template/` to the new app repo.
2. Edit `directory.config.ts` — all fields in the table above (brand + locales, `taxonomy.*`, affiliates, billing, ads, `content.siloSpokes`, scraping). This is the ONLY engine-facing edit; everything downstream (catalog, nav, collections, sitemap, silo routes) derives from it.
3. Neutralize/replace `i18n/locales/` and the sample content — fr+en are verified template copy; **de/es/it/pt are unverified machine drafts** with partial key parity (~400 vs ~766 keys) — see `i18n/README.md`. Replace the sample articles (`content/fr/blog/`, `content/en/blog/`, `content/fr/category-guides/`, `content/en/category-guides/`); if you rename a spoke in `content.siloSpokes`, update the i18n `guide.types.<slug>` keys and the content frontmatter `type:` values to match.
4. Add niche scraping sources in `server/services/scraping/sources/` + registry (mirror the id in `sources/ids.ts`), list the id in `directory.config.ts` `scraping.sources` (registry validates it at boot), and extend the CRM/venv automation — easy.
5. Create Stripe products matching the `billing.plans[].id` plan ids (configured in `directory.config.ts` `billing` — the single source; price lookup keys `${id}_monthly` / `${id}_yearly`).

Done — zero engine-code edits (components, composables, server layer, shared/ engines stay untouched). `pnpm test:unit` runs the instantiation contract test and fails fast on incoherent config.

## Commands

```bash
pnpm dev              # Dev server (localhost:3000)
pnpm build            # Production build + scripts/ai-ready-db-init.mjs
pnpm start            # node .output/server/index.mjs
pnpm lint             # oxlint + eslint (two-stage)
pnpm lint:ox          # Strict: oxlint --deny-warnings + eslint --max-warnings 0
pnpm lint:fix         # eslint --fix
pnpm db:generate      # Drizzle Kit generate migrations
pnpm db:migrate       # Drizzle Kit apply migrations
pnpm db:studio        # Drizzle Kit studio GUI
pnpm seed             # tsx server/db/seed.ts
pnpm task             # List Nitro scheduled tasks
pnpm typecheck        # nuxt typecheck
pnpm test             # vitest run (all projects)
pnpm test:unit        # vitest --project unit (node env, no DB)
pnpm test:nuxt        # vitest --project nuxt (component tests, happy-dom, no DB)
pnpm test:integration # vitest --project integration (PGlite in-memory Postgres; DB_PERF=1 adds perf smoke)
pnpm test:e2e         # playwright test (needs DB + Redis; specs in e2e/)
pnpm test:coverage    # vitest run --coverage
```

Node 24 (`.nvmrc`/engines), pnpm ≥11 (`packageManager: pnpm@11.8.0`).

## Structure

```
.
├── app/                    # PRIMARY source (Nuxt 4). Pages, components, composables, middleware, layouts
├── server/                 # Backend: API, DB, services, jobs, tasks [SEE server/AGENTS.md]
├── shared/                 # Client+server engine: directory.config types, affiliates.ts, activities.ts, silo.ts, nav.ts, auth.d.ts
├── content/{en,fr}/        # Nuxt Content v3: blog/ + category-guides/ collections
├── i18n/locales/           # 6 locale JSON files (fr, en verified; de, es, it, pt drafts) [SEE i18n/README.md]
├── directory.config.ts     # ← THE instantiation config
├── content.config.ts       # Collections: blog_{fr,en}, categoryGuides_{fr,en}
├── nuxt.config.ts          # Reads directoryConfig; wires i18n/SEO/security/scripts
├── docs/                   # design-system.md + guides
├── e2e/ + playwright.config.ts + test/  # E2E (Playwright) and vitest specs
└── public/img/             # Replaceable placeholder imagery [SEE docs/design-system.md §7]
```

## Where to Look

| Task | Location | Notes |
|------|----------|-------|
| Instantiate a niche | `directory.config.ts` | Then follow the 7-step workflow above |
| Add a page | `app/pages/` | Pages: `/` home, `/venues` + `/venues/[slug]`, `/categories` hub + `/categories/[category]` + `/categories/[category]/[cities]` — ONE dispatch route serving BOTH the silo spokes (config data: `directoryConfig.content.siloSpokes`, e.g. `/guide`, `/choisir-venue`, `/comparer`, `/tarifs`, `/equipement`, `/techniques`) and the category×city pages — plus `/country/**` location browsing, `/blog` + `/blog/[slug]`, `/contact`, `/about`, `/legal`, `/auth/*`, `/dashboard/**` (auth middleware), `/dashboard/admin/match-candidates` |
| Add a component | `app/components/{domain}/` | Domain: base, venue, categories, section, content, affiliate, ads, auth, blog, sidebar, modal, franchise, dashboard, admin, OgImage, prose |
| Add a composable | `app/composables/` | Pattern: `useXxx.ts`, reactive state + methods |
| Add an API route | `server/api/{domain}/` | File-based: `index.get.ts`, `[slug].ts` |
| Add a DB table | `server/db/schemas/{domain}.ts` | Then re-export in `schemas/index.ts` |
| Add a query function | `server/db/queries/{domain}.ts` | Use `useDrizzle()` |
| Add a scraper | `server/services/scraping/sources/` | Implement adapter, register in `registry.ts` |
| Add a scheduled task | `server/tasks/` | Nitro task; register in nuxt.config.ts `scheduledTasks` |
| Add translations | `i18n/locales/{lang}.json` | Keys are contract; fr default |
| Add editorial content | `content/{fr,en}/blog/` or `content/{fr,en}/category-guides/` | Zod frontmatter — see content.config.ts |
| Shared engine code | `shared/` | affiliates.ts mechanics, silo.ts types, activities.ts catalog |

## Architecture

### Frontend (`app/`)

- **Pages** (29, listed above): public directory surfaces (`/venues`, `/categories` hub/detail + silo spokes/category×city through the `[cities].vue` dispatch route, `/country/**`), blog, dashboard + admin.
- **Middleware**: `auth.ts`, `admin.ts`, `redirect-category-slugs.global.ts` (legacy slug redirects).
- **Layouts**: `default.vue`, `dashboard.vue`, `auth.vue`, `error.vue`.
- **Composables** (13): `useAuth`, `useStripe`, `useAffiliate`, `useCitySearch`, `useVenueFilters`, `useMapLink`, `useCategoryRouteI18n`, `useLocaleSwitcher`, `usePasswordReset`, `useConfirmDialog`, `useDashboardAnimations`, `content-markdown`.

### Server (`server/`) — SEE `server/AGENTS.md`

Layered: API routes → services → queries → schemas. Redis-backed Nitro storage + rate limiting. Nuxt-language: always `useDrizzle()`, response shape `{ data, meta? }`.

### Scraping pipeline

- **Jobs** (`server/jobs/scrape-venues.ts`) orchestrate; `server/services/scraping/` hosts browser/parser/storage/state/rate-limit + `sources/` adapters.
- Template ships **two reference adapters** (`masalledesport`, `fitnesspark` — multi-sport aggregators) as the pattern to copy; each instantiation adds its own.
- Flow: scrape → `ingest.ts` → normalize + upsert `venueSources` → `matching.ts` (rules + geocoding + AI) → unmatched ⇒ `matchCandidates` (PENDING) → admin review at `/dashboard/admin/match-candidates`.
- Scheduled tasks (nuxt.config.ts): venues multi-source re-scrape 03:00, category-content generation 04:00 (fr/en), venue-website validation Sun 05:00, venue AI enrichment 06:00, geocoding catch-up 06:30.

## Conventions

- **Two-stage linting**: oxlint (fast) → ESLint (thorough). Config: `.oxlintrc.json` + `eslint.config.mjs`; `eslint-plugin-oxlint` avoids duplicate rules.
- **Package manager**: pnpm only (`packageManager: pnpm@11.8.0`, shamefully-hoist=true).
- **Zod v4** everywhere; shared validators via drizzle-zod.
- **i18n**: `prefix_except_default` — fr has no URL prefix. `strictSeo: true` (hreflang auto-injection). No browser-language detection redirect.
- **DB**: always `useDrizzle()`; import schemas from `~~/server/db/schemas`; slugs via SQL `slugify()`; JSONB for multilingual content; GIN trigram index on `venues.normalizedName`.
- **API response**: `{ data: T, meta?: { totalCount, page, pageSize, totalPages } }`.
- **Auth**: `requireUserSession(event)` protected / `getUserSession(event)` optional; session plugin injects DB user + subscription.
- **Validation**: `readValidatedBody` + Zod.
- **Drizzle config**: `drizzle.config.ts` — schema glob `./server/db/schemas/*.ts`, out `./server/db/migrations`.
- **Content config**: `content.config.ts` — collections `blog_fr`/`blog_en` + `categoryGuides_fr`/`categoryGuides_en`. Guide collections query by frontmatter (`style` + `type`); sitemap emitted manually in `server/api/__sitemap__/urls/` with hreflang.

## Design System — Neutral Base

See **`docs/design-system.md`** for the full contract. Summary of **template invariants**:

- **Palette**: Tailwind built-in **slate** for primary/secondary/neutral (WCAG AA overrides in `main.css`). No brand color in the template.
- **Typography**: **Manrope only** (400/500 body, 700 uppercase headings). `--font-display` falls back to Manrope for easy niche display-face swap.
- **Shape & physics**: `rounded-sm` only (`--ui-radius: 0.125rem`), NO `shadow-*`, flat borders (`border-default`), hover via `border-primary`, 150ms transitions.
- **Re-theming contract**: a niche app re-brands in `app/assets/css/main.css` + `app/app.config.ts` ONLY — built-in palette swap (zero CSS) or custom `@theme static` scale. Component code never changes.

Never `rounded-lg` / `rounded-xl` / `rounded-full` / `shadow-*` / `any` type.

## Monetization Invariants

- **Unconfigured ⇒ renders nothing**: empty AdSense client/slot ⇒ `<AdsAdUnit>` renders nothing and no script loads; empty affiliate publisher/merchant id ⇒ partner button hidden. Never ship a half-configured monetization slot.
- **Ads placement**: ads stay OUT of search/listing flows and `/dashboard` (paying venues), and never adjacent to affiliate blocks (`::equipment-kit`).
- **Affiliate links**: `rel="sponsored noopener noreferrer"` + the `affiliate.disclosure` string are mandatory next to every affiliate block (French loi « confiance dans l'économie numérique »).

## Known Template Decisions & Simplifications

State explicitly so agents don't "fix" them by accident:

- **Dual taxonomy** kept from FCF: `venueCategories` DB table (venue FK) + `activities` editorial catalog (drives the `/categories` surface and DB matching helpers). An instantiation may COLLAPSE them into one table — the template keeps the FCF shape.
- **Silo spoke vocabulary is config data** (`directoryConfig.content.siloSpokes` → `shared/silo.ts` `SILO_SPOKE_TYPES`); the spokes render through one dispatch route (`app/pages/categories/[category]/[cities].vue` → `CategoriesContentView` / `CategoriesCityPage`), no static per-spoke page files. Per-niche rename = config + i18n `guide.types.<slug>` keys + content frontmatter `type:` values.
- **DB-per-app, fresh migrations**: migrate to a NEW empty database only. The ~45 legacy migrations contain FCF martial-arts data and seeds — historical, append-only; do not squash or "clean" them without a strategy decision.
- **`style` frontmatter key** in `categoryGuides_{fr,en}` is the **canonical category slug** (editorial catalog slug), deliberately NOT renamed to `category` to avoid collision with the existing editorial `category:` frontmatter field.
- Sample content generation uses Gemini (`GEMINI_API_KEY`); translation memory tables exist (`translation.ts` migration).

## Environment Variables

No `.env.example` — check `nuxt.config.ts` runtimeConfig.

**Required:** `DATABASE_URL`, `NUXT_SESSION_PASSWORD` (32+ chars), `CSRF_SECRET`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`, `SCRAPE_API_KEY` (`X-Scrape-Key` header on `/api/venues/scrape`).

**Optional:** `PLUNK_SECRET_API_KEY`, `PLUNK_BASE_URL`, `PLUNK_DEFAULT_FROM` (email), `GEMINI_API_KEY` (AI matching/enrichment/content gen), `LOCATIONIQ_API_KEY`, `LOCATIONIQ_REGION`, `GEONAMES_USERNAME` (geocoding chain LocationIQ → GeoNames → Nominatim), `TEST_DATABASE_URL`.

**Monetization (public, runtime):**
- Affiliates: `NUXT_PUBLIC_AFFILIATE_RAKUTEN_SITE_ID`, `NUXT_PUBLIC_AFFILIATE_AWIN_AFFID` — publisher ids; empty ⇒ partner buttons hidden globally. Amazon associate tags per storefront: `NUXT_PUBLIC_AFFILIATE_AMAZON_TAG_US` / `_UK` / `_FR` / `_DE` / `_ES` / `_IT` / `_PT` (pt tag rides the amazon.es storefront — Amazon has no Portuguese marketplace); empty ⇒ untagged search URLs.
- Ads: `NUXT_PUBLIC_ADSENSE_CLIENT` (build-time `ca-pub-…`, gates script registry + `/ads.txt`) + slots `NUXT_PUBLIC_ADSENSE_SLOT_HOME`, `NUXT_PUBLIC_ADSENSE_SLOT_CATEGORIES_HUB`, `NUXT_PUBLIC_ADSENSE_SLOT_CATEGORY_DETAIL` (renamed from `*_STYLES_HUB`/`*_STYLE_DETAIL` at extraction).
- Stripe: plan ids come from `directory.config.ts` `billing.plans[].id` — create matching Stripe products + `${id}_monthly`/`${id}_yearly` price lookup keys.

**Analytics:** `NUXT_UMAMI_HOST`, `NUXT_UMAMI_ID` (+ runtime cloak `NUXT_UMAMI_WEBSITE`, `NUXT_UMAMI_ENDPOINT`).

## Key Gotchas

- **sharp is pinned** (see package.json overrides) — only native binding allowed alongside `better-sqlite3`. Never build other native bindings.
- **`postinstall` runs `nuxt prepare`** — never run it manually.
- `@nuxt/content` has a local patch (`patches/@nuxt__content.patch`).
- Blog pages are **prerendered** (content-only, freshness-safe); ALL DB-coupled pages (venues, categories hubs, city hubs) stay SSR — their data changes daily via the scraper cron. Do not prerender them.
- `/dashboard/**` and `/admin/**` are `robots: false` and excluded from the sitemap.
- CSRF: nuxt-csurf derive-key gotcha is documented in nuxt.config.ts — don't "simplify" the key derivation.
- Affiliate partner example: Decathlon per-locale program map — see `directory.config.ts` (`affiliates.partners`). Its data pattern (one network per country, per-locale store hosts) is proven in production.
- Deployment target is Nixpacks (`nixpacks.toml`, maps to any container host) with Redis; no CI/CD configured.
