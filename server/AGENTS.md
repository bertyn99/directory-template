# Server Layer — AGENTS.md

**Updated:** 2026-06-01 | **Commit:** 6bb224b

## Overview

Layered backend: API routes → Services → Queries → Schemas.
PostgreSQL via Drizzle ORM. Redis for caching/state.

## Structure

```
server/
├── api/                    # 30 file-based API routes (auth, venues, users, franchises, countries, cities, styles, admin)
├── db/
│   ├── schemas/            # 9 domain schema files + index.ts + utils.ts
│   ├── queries/            # 6 typed query files (venues, auth, users, franchises, subscription, styles)
│   ├── service/            # LEGACY — use queries/ for new code. Only venue.ts + contentGen.ts remain
│   ├── migrations/         # 39 SQL migrations (Drizzle Kit managed)
│   └── data/               # Seed data
├── services/
│   ├── venues/              # matching.ts, aiMatcher.ts, ingest.ts — venue dedup + AI matching
│   ├── location/           # normalize.ts (address), geocoding.ts (Nominatim)
│   ├── translation/        # deepl.ts (Gemini + Redis), autoTranslate.ts, glossary.ts
│   ├── scraping/           # Scraping architecture (browser, parser, storage, state, rate-limit)
│   │   └── sources/        # Source adapters: fitnesspark, masalledesport (reference adapters — add per niche)
│   └── monitoring/         # scraperAlerts.ts
├── jobs/                   # Background jobs: scrape-venues.ts (multi-source)
├── tasks/                  # Nitro scheduled tasks (venues-multi-source, generate-category-content, validate-venue-websites, enrich-venues, geocode-addresses)
├── utils/
│   ├── auth/               # otp.ts, password.ts
│   ├── email.ts            # Plunk integration
│   ├── stripe.ts           # getOrCreateCustomerId, subscription queries
│   ├── drizzle.ts          # useDrizzle() singleton (pg.Pool + schema)
│   ├── session.ts          # Session helpers
│   └── format.ts           # Data formatting
├── plugins/                # session.ts — extends user session with DB data + subscription
├── middleware/             # Server middleware
└── types/                  # Server-side TypeScript types
```

## Where to Look

| Task | Location | Notes |
|------|----------|-------|
| Add an API endpoint | `api/{domain}/` | File-based: `index.get.ts`, `[slug].ts`, `[id].put.ts` |
| Add a DB table | `db/schemas/{domain}.ts` | Re-export in `schemas/index.ts`, add relations |
| Add a query function | `db/queries/{domain}.ts` | Use `useDrizzle()`, import schemas from `~~/server/db/schemas` |
| Add a business service | `services/{domain}/` | Thin wrapper between API and queries |
| Add a scraping source | `services/scraping/sources/` | Implement adapter, register in `registry.ts` |
| Add a background job | `jobs/` | Use services/ for logic |
| Add a scheduled task | `tasks/` | Register in `nuxt.config.ts` scheduledTasks |
| Add a server utility | `utils/` | Auto-imported by Nuxt |
| Add validation schema | `shared/validator/` | Use `drizzle-zod` for DB-backed validators |

## DB Access Pattern

```typescript
// ALWAYS use useDrizzle() — singleton with pg.Pool
import { useDrizzle } from "#imports"
import { venues, cities } from "~~/server/db/schemas"

const db = useDrizzle()
const result = await db.select().from(venues).where(eq(venues.slug, slug))
```

**Available operators** (exported from `utils/drizzle.ts`): `sql`, `eq`, `and`, `or`, `inArray`, `like`

## API Response Format

```typescript
// Paginated list
return { data: items, meta: { totalCount, page, pageSize, totalPages } }

// Single item
return { data: item }

// Error
throw createError({ statusCode: 400, statusMessage: "Invalid input" })
```

## Auth Patterns

```typescript
// Protected route
const session = await requireUserSession(event)  // throws 401 if unauthenticated
session.user.id  // userId

// Optional auth
const session = await getUserSession(event)
if (session.user) { /* authenticated */ }
```

Session plugin (`plugins/session.ts`) extends session with DB user data + subscription status on every fetch.

## DB Schema Quick Reference

| Schema File | Tables | Key Notes |
|-------------|--------|-----------|
| `auth.ts` | users (UUID), accounts, sessions | OAuth + credentials. accounts/sessions CASCADE on user delete |
| `core.ts` | types, franchises | franchises.ownerId SET NULL on user delete |
| `location.ts` | countries, cities, addresses | Auto-generated slugs. cities → countries CASCADE |
| `venues.ts` | venues, userVenues, formulas, images, events, reviews | venues has JSONB for multilingual desc, GIN trigram index on normalizedName |
| `activities.ts` | thematiques, activities, equipments | Activities have localized JSONB (en/fr content, slugs) |
| `subscription.ts` | subscriptions | userId UNIQUE, Stripe integration |
| `sources.ts` | sources, sourceCountries | Scraping source registry |
| `venueSources.ts` | venueSources | Tracks scraped data with match scores and trust |
| `matchCandidates.ts` | matchCandidates | PENDING/APPROVED/REJECTED workflow for AI matching |

**Slugs**: Auto-generated via SQL `slugify()` function (unaccent → lowercase → hyphenate).
**JSONB**: Used for multilingual content (`description`, `content`, `slugs` with locale keys).

## API Routes Map

| Domain | Routes | Auth |
|--------|--------|------|
| Auth | login.post, signup.post, verify-otp.post, forgot-password.post, reset-password.post | Public |
| Venues | index (GET list), [slug] (GET detail), scrape.post | scrape.post requires auth |
| Users | me.put, venues/ (GET, POST, PUT) | All require auth |
| Franchises | index (GET, POST), [id] (PUT, DELETE) | All require auth |
| Countries | index.get, [slug].get | Public |
| Cities | index, [citySlug]/index | Public |
| Styles | index.get, [slug]/index.get, [slug]/cities.get | Public |
| Admin | match-candidates/ (GET, approve, reject), monitoring/scraper-metrics, tasks/generate-category-content.post, tasks/generate-venue-content.post | All require auth |
| Sitemap | __sitemap__/urls | Public |

## Scraping Architecture

### Pattern (USE THIS)
- **Jobs** (`server/jobs/`): Orchestration entry point (`scrape-venues.ts`)
- **Services** (`server/services/scraping/`): Reusable components
  - `browser.ts` — Playwright singleton with retry
  - `parser.ts` — Data extraction helpers
  - `storage.ts` — Batch processing
  - `state.ts` — Redis state tracking
  - `rate-limit.ts` — Per-source rate limiting
  - `matching-batch.ts` — Batch matching
  - `activities.ts` — Activity matching helpers
- **Sources** (`services/scraping/sources/`): Adapter pattern
  - Each source: implements standard interface, registered in `registry.ts`
  - Active: fitnesspark, masalledesport (template reference adapters; each instantiation registers its own)

### LEGACY (DO NOT USE)
- `server/db/service/venue.ts` — REMOVED at template extraction; do not recreate

### Matching Pipeline
1. Scrape → `ingest.ts` → normalize + upsert into `venueSources`
2. `matching.ts` → rule-based + geocoding + AI matching
3. Unmatched → `matchCandidates` (PENDING) for admin review
4. Admin → approve/reject via `/admin/match-candidates/`

## Conventions

- **Validation**: Always `readValidatedBody` + Zod. Shared validators in `shared/validator/`
- **Error handling**: Re-throw H3Errors. Wrap ZodErrors as 400. Generic errors as 500
- **Services**: Business logic goes in `services/`, NOT in API route handlers
- **Queries**: DB access goes in `db/queries/`, NOT in services or routes
- **Franchise scoping**: Always filter by `ownerId` (from session) in franchise queries

## Anti-Patterns

- **NEVER** write raw SQL in route handlers — use query functions
- **NEVER** use `server/db/service/` for new code — use `server/db/queries/`
- **NEVER** use `any` type — strict TypeScript enforced
- **NEVER** mix scraping logic with data persistence — separate jobs from services
- **NEVER** skip validation on API inputs — always use Zod schemas
