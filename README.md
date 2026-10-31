# Directory Template

A reusable **directory web-app template** — the neutral base for niche "spots & venues" directories (extracted from a production martial-arts clubs directory). Ships a neutral sample niche (fitness / yoga / spa venues, Europe), French-first fr/en, with everything niche-specific centralized in **one config file**.

Stack: **Nuxt 4 · Nuxt UI v4 · Drizzle ORM (PostgreSQL) · nuxt-auth-utils · Stripe · Nuxt Content v3**. Zod v4, Vercel AI SDK v6, Redis storage, nuxt-security, @nuxtjs/seo.

> Unconfigured monetization renders nothing: empty ad/affiliate ids ⇒ hidden buttons, no ad script. Never activate before the programs are signed.

## What's inside

| Area | What ships |
|---|---|
| Public site | Home, `/venues` + detail, `/groups/**` (public franchise hubs), `/categories` hub/detail/category×city, city chain `/{country}/{city}[/{category}]` (config-shape: `content.cityUrlPattern` — legacy `/country/**` URLs 301), blog, silo guide spokes, legal/contact |
| Taxonomy | `venueCategories` DB table (venue FK) + an editorial activity catalog driving `/categories` — samples: fitness, yoga, spa. Per-venue structured attributes (`venues.attributes` JSONB + `taxonomy.facets`): config-declared boolean/enum facets rendered as detail-page chips, filterable via `?facet=key:value`, with public `formulas` (prices) + `equipments` sections on the venue page |
| Data pipeline | Scraping framework (browser/server-HTML/JSON adapters, rate-limit, state) + 3 reference adapters (masalledesport, fitnesspark, osm-overpass), ingestion → dedup/matching (rules + geocoding + AI) → admin review queue for unmatched candidates |
| Ops | Nitro scheduled tasks (re-scrape, content generation, venue validation, AI enrichment, geocoding), Redis-backed caching/rate-limiting, scraper alerting |
| Monetization | Stripe subscriptions (`premium` / `premium_pro` plans), AdSense slots, affiliate partner programs (per-locale, network-aware — Rakuten/Awin; search OR direct landing mode), outbound booking CTAs (`booking.partners` — sponsored rel + disclosure vs plain outbound), all config-driven |
| Auth & dashboard | Email/password + OTP reset, venue owner dashboard, franchise management, admin panels, RBAC |
| SEO | Strict i18n SEO (hreflang), sitemap with alternates, OG image generation, IndexNow, robots rules, per-page schema.org |
| Content | Nuxt Content v3 blog + category-guide collections (fr/en, prerendered) |
| Tests | Vitest projects: unit (120) · component (20) · integration (PGlite in-memory Postgres) · Playwright e2e |

## Quickstart

```bash
pnpm install          # packageManager pnpm@11.8.0, node 24 (see .nvmrc)
# set envs: DATABASE_URL, NUXT_SESSION_PASSWORD, CSRF_SECRET, REDIS_*, SCRAPE_API_KEY
pnpm db:migrate       # apply migrations — fresh DB ONLY (legacy migrations are historical)
pnpm seed
pnpm dev              # → localhost:3000
```

## Instantiate a new directory

1. Copy this repo to the new app.
2. Edit **`directory.config.ts`** — brand, url, locales, taxonomy (categories/aliases/families + venue attribute `facets` and their `facet.*` i18n keys), affiliates, billing plans, ad slots, silo spokes, scraping sources + seed cities.
3. Replace/neutralize `i18n/locales/` (fr+en verified; de/es/it/pt are unverified drafts — see `i18n/README.md`) and the sample content (`content/{fr,en}/blog/` + `content/{fr,en}/category-guides/`).
4. Add your scraping sources (adapters + registry + `sources/ids.ts` mirror; list the ids in the config — the registry validates them at boot).
5. Create Stripe products matching the `billing.plans[].id` ids (price lookup keys `${id}_monthly` / `${id}_yearly`).

Done — zero engine-code edits: `shared/` engines (catalog, nav, silo routes, affiliates, sitemap) derive everything from the config, and `pnpm test:unit` runs an instantiation contract test that fails fast on incoherent config.

Then re-theme in `app/assets/css/main.css` + `app/app.config.ts` only — component code never changes (see `docs/design-system.md`).

## Commands

```bash
pnpm dev | build | start        # dev server / production build / run .output
pnpm lint                       # two-stage: oxlint + eslint
pnpm test:unit | test:nuxt | test:integration | test:e2e
pnpm db:generate | db:migrate | db:studio
```

Full command list, conventions, env vars and gotchas: **`AGENTS.md`**.

## Design system

Neutral base theme: Tailwind **slate** palette, **Manrope**-only typography, `rounded-sm` max radius, no drop shadows, hover via border color. Re-brand per niche via CSS variables + `app.config.ts` — zero component edits. Full contract: `docs/design-system.md`.

## Docs

- **`AGENTS.md`** — commands, architecture, conventions, the full `directory.config.ts` instantiation contract, env vars, gotchas. Start here.
- `docs/design-system.md` — neutral base theme + re-theming contract.
- `i18n/README.md` — locale status and key conventions.
- `server/AGENTS.md` — backend layering and the scraping pipeline.
- `docs/architecture/` — backend structure, API patterns, scraping architecture.

## Origin

Extracted by subtraction from a production martial-arts clubs directory; every niche-specific piece was either removed or moved behind `directory.config.ts`, so the engine code stays untouched per instantiation.
