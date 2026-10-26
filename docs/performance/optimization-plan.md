# Query Performance Optimization Plan

**Based on:** `test/bench/baselines.json` (2026-06-30, local DB)  
**Method:** Global wins first (indexes, pool, cache, patterns), then per-query refactors.

---

## Baseline snapshot

Queries grouped by **p95 latency** (the metric we gate on):

| Tier | p95 | Queries | Pattern |
|------|-----|---------|---------|
| **Critical** | >500ms | `getAllVenueSlugs`, `getCategoryCityCombinations`, `searchVenues.default`, `getVenueFormulas`, `searchCities`, `getCityHubSlugs` | Full scans / heavy joins / no limit |
| **High** | 300–500ms | `getCityHubData`, `listActivities`, `getActivityBySlug`, `searchVenues.withSearch`, `getActivitiesByCitySlug`, `getVenueReviews` | Multi-join aggregations or JSONB |
| **Volatile** | p50 ~30ms, p95 ~270–530ms | `getCityBySlug`, `getVenueActivities`, `getCitiesByCountrySlug`, `getVenueFormulas`, … | Likely pool/IO variance + missing indexes |
| **Healthy** | p95 <80ms | Auth, subscription, single-row lookups, `getMatchCandidates`, `getCountriesWithCounts`, … | Indexed PK/FK paths |

**Key insight:** ~25 queries share p50 ≈ 28–35ms but p95 spikes 5–15×. That pattern points to **connection pool / cold-cache noise** as much as SQL shape. Global pool + index work should lift the whole floor before micro-optimizing each query.

---

## Phase 1 — Global (do first)

Impact: all queries. Effort: low–medium. Do these before any per-query refactor.

## Phase 1 — Global (applied 2026-06-30)

- [x] **1.1** Pool config — `DB_POOL_MAX`, `DB_POOL_IDLE_TIMEOUT_MS`, `DB_POOL_CONNECTION_TIMEOUT_MS` in `server/utils/drizzle.ts`
- [x] **1.2** Index migration — `20260630152925_pretty_whistler` (applied via `pnpm db:migrate`)
- [ ] **1.3** Drizzle cache adapter — `server/utils/drizzleNitroCache.ts` ready; wire `cache:` in `useDrizzle()` after optimizations. Opt-in via `.$withCache()`. `QUERY_CACHE=0` disables.
- [x] **1.4** Skipped — keep `description` on `searchVenues` (used by `Venue/Card.vue`)
- [x] **1.5** Window-count pagination — `searchVenues`, `getVenueReviews`

Mutations invalidate cached selects automatically when `autoInvalidate` is enabled (Drizzle default). Manual: `useDrizzle().$cache.invalidate({ tables: venues })`.

**After deploy:** `pnpm db:migrate` then `pnpm bench:queries -- --update` to record new baselines.

Pool tuning is applied in `server/utils/drizzle.ts` (`DB_POOL_MAX`, idle/connection timeouts).

### 1.2 Missing indexes (single migration)

Almost every slow query joins `venues` → `addresses` → `cities` or filters on `status` / `slug`.

| Index | Helps |
|-------|-------|
| `venues(slug)` UNIQUE | `getVenueBySlug`, `getOwnedVenueBySlug`, slug filters |
| `venues(status)` WHERE status = 'active' | Hub, sitemap, search default |
| `venues(address_id)` | Every location join |
| `venue_activities(venue_id)` | `searchVenues` array_agg, style×city |
| `venue_activities(activity_id)` | Activity-filtered searches |
| `addresses(city_id)` | Already `city_idx` — verify used |
| `cities(country_id, name)` | Country city lists, hub matcher |
| `countries(slug)` | Hub + country pages |

**Action:** `EXPLAIN (ANALYZE, BUFFERS)` on top 5 slow queries before/after migration.

### 1.3 Drizzle cache for read-heavy, rarely-changing data

Redis is already wired (`nitro.storage.redis`). Use Drizzle's built-in cache with a custom `NitroStorageCache` adapter (`server/utils/drizzleNitroCache.ts`), not a hand-rolled wrapper.

| Query | TTL | How |
|-------|-----|-----|
| `getAllVenueSlugs` | 1h | `.$withCache({ tag: 'venues:all-slugs', config: { ex: 3600 } })` on the select |
| `getCategoryCityCombinations` | — | Raw `db.execute` — **not cacheable** by Drizzle |
| `getCityHubSlugs` | 1h | `.$withCache({ tag: 'cities:hub-slugs', config: { ex: 3600 } })` |
| `getCountriesWithCounts` | 6h | `.$withCache({ config: { ex: 21_600 } })` |
| `getAllActivitySlugs` | 24h | `.$withCache({ config: { ex: 86_400 } })` |
| `listActivities` (no search) | 1h | `.$withCache({ tag: 'activities:list', config: { ex: 3600 } })` |

**Not yet applied** — infrastructure only. Add `.$withCache()` when you want to enable caching on specific selects.

**Expected win:** Tier Critical sitemap selects drop from **seconds → single-digit ms** when warm.

### 1.4 ~~Drop JSONB from list endpoints~~ — skipped

`searchVenues` **must keep** `description`: `Venue/Card.vue` renders a `line-clamp-2` excerpt from localized JSONB (`shortDescription` computed). Removing it would break public venue listings.

`getUserVenues` does not use `description` on the dashboard table today — trimming it there would be a minor win only. Not prioritized unless dashboard starts showing descriptions.

**Alternative if `searchVenues` is still slow after indexes/cache:** select only `description` keys needed for the card excerpt (e.g. `intro` slice) via SQL `jsonb` projection — not a full column drop.

### 1.5 Pagination: one query instead of two

`searchVenues` and `getVenueReviews` run **identical join twice** (data + count).

Replace with:

```sql
SELECT ..., COUNT(*) OVER() AS total_count
FROM …
LIMIT $n OFFSET $m
```

**Expected win:** `searchVenues.default` p95 ~800ms → ~400ms (halving round-trips).

---

## Phase 2 — Global patterns (after Phase 1, re-benchmark)

### 2.1 Materialized views for sitemap / SEO aggregates

| View | Replaces | Refresh |
|------|----------|---------|
| `mv_style_city_pairs` | `getCategoryCityCombinations` | `REFRESH CONCURRENTLY` nightly + on venue ingest |
| `mv_city_hub_slugs` | `getCityHubSlugs` | Same |
| `mv_country_stats` | `getCountriesWithCounts` | Same |

**Expected win:** `getCategoryCityCombinations` p95 947ms → <50ms; `getCityHubSlugs` p95 501ms → <50ms.

### 2.2 Consolidate multi-round-trip page queries

`getCityHubData` runs **5–6 sequential queries** (p95 432ms). Merge into 1–2 SQL statements (CTEs for total, activities breakdown, top venues).

`getOwnedVenueBySlug` runs **3 reads** (p95 76ms — acceptable, but mergeable to 1 with LEFT JOIN ownership).

### 2.3 `pg_stat_statements` on staging

Enable extension, run 24h of prod-like traffic, export top 10 by `total_time` and `mean_time`. Validate bench priorities against real traffic mix.

---

## Phase 3 — Per-query optimizations

After Phase 1–2, re-run `pnpm bench:queries -- --update` and tackle remaining outliers.

### Critical tier

#### `getAllVenueSlugs` — p50 745ms, p95 **1728ms**
- **Root cause:** `SELECT slug, updated_at FROM venues` — full table scan, no LIMIT, every row over wire.
- **Global:** Redis cache (Phase 1.3) — primary fix.
- **Individual:** Index-only scan if `slug` indexed; select only needed columns (already minimal); cursor/stream for sitemap build if cache miss.
- **Target:** p95 <50ms (cached), <200ms (uncached).

#### `getCategoryCityCombinations` — p95 **947ms**
- **Root cause:** `DISTINCT` over 5-table join (venues × addresses × cities × venue_activities × activities), returns `activity_slugs` JSONB.
- **Global:** Materialized view (Phase 2.1).
- **Individual:** Drop `activity_slugs` from sitemap (only `activity_slug` + `city_slug` used in `__sitemap__/urls`); add `WHERE venues.status = 'active'`.
- **Target:** p95 <100ms.

#### `searchVenues.default` — p50 395ms, p95 **833ms**
- **Root cause:** 5-table join + `array_agg` + `GROUP BY` + duplicate count query; includes `description` JSONB (required by `Venue/Card.vue`).
- **Global:** Indexes (1.2), window count (1.5). Do **not** drop `description` from the list response.
- **Individual:**
  - Defer `activities` to second query or subselect per page (remove `venue_activities` from main join).
  - Filter `venues.status = 'active'` by default.
  - Use `normalized_name` trigram index for text search instead of `ilike(name)`.
- **Target:** p95 <150ms.

#### `getVenueFormulas` / `searchCities` — p95 **531ms / 523ms** with p50 ~30ms
- **Root cause:** Volatility — likely pool contention during bench burst, not inherent query cost.
- **Action:** Re-benchmark after pool tuning. If still high: `formulas(venue_id)` index; `cities(name)` trigram for `searchCities`.
- **Target:** p95 <80ms.

#### `getCityHubSlugs` — p95 **501ms**
- **Root cause:** 4-table join + `GROUP BY country + city name` + `slugify()` per group.
- **Global:** Materialized view or Redis cache.
- **Individual:** Precompute `city_name_slug` column on cities to avoid `slugify()` at query time.
- **Target:** p95 <100ms.

### High tier

#### `getCityHubData` — p95 **432ms**
- **Individual:** Merge queries 3–5 into one CTE; replace correlated JSON subquery in top venues with join; reuse `cityMatcher` as SQL fragment.
- **Target:** p95 <150ms (≤2 round-trips).

#### `listActivities` — p95 **341ms** (p50 60ms)
- **Individual:** Already pruned columns. Add `WHERE` nothing — check if seq scan; index `activities(name)` for search variant only.
- **Target:** p95 <50ms.

#### `getActivityBySlug` — p95 **343ms**
- **Individual:** `columns:` prune on RQB `findFirst` (exclude content, techniques, faqs…); single composite index on `(slug)`; locale path uses GIN on `slugs` (exists).
- **Target:** p95 <80ms.

#### `getVenueReviews` — p95 **312ms**
- **Global:** Window count (1.5).
- **Individual:** `reviews(venue_id, created_at DESC)` index.
- **Target:** p95 <100ms.

#### `searchVenues.withSearch` — p95 **349ms**
- **Individual:** Use `normalized_name % search` trigram instead of `ilike(name)` — index already exists.
- **Target:** p95 <150ms.

#### `getActivitiesByCitySlug` — p95 **315ms**
- **Individual:** Start from `cities WHERE slug = $1` (indexed), then join — avoid `LEFT JOIN` chain from activities; drop `slugs` JSONB from select.
- **Target:** p95 <100ms.

### Volatile tier (p50 good, p95 spikes)

These 15+ queries (`getCityBySlug`, `getVenueActivities`, `getCitiesByCountrySlug`, …) likely **share infra cause**:

1. Apply pool tuning (1.1) first.
2. Re-benchmark — if p95 still >3× p50, add FK indexes listed in 1.2.
3. Do **not** refactor SQL until variance drops.

### Healthy tier — no action

Auth, subscription, `getMatchCandidates`, `getCountriesWithCounts`, `getOwnerVenueStats`, single-venue lookups — leave alone unless prod `pg_stat_statements` says otherwise.

---

## Recommended execution order

```
Week 1 — Global floor
├── 1.1 Pool config
├── 1.2 Index migration + EXPLAIN on top 5
└── Re-benchmark → expect volatile tier to shrink

Week 2 — Cache + pagination
├── 1.3 Drizzle NitroStorageCache + opt-in .$withCache on sitemap selects
├── 1.5 Window count in searchVenues + getVenueReviews
└── Re-benchmark → Critical tier should lose worst offenders

Week 3 — Heavy refactors
├── 2.1 Materialized views (style×city, city hub slugs)
├── 2.2 getCityHubData CTE merge
└── Per-query: searchVenues join split, getActivityBySlug column prune

Ongoing
├── pg_stat_statements on staging
└── pnpm bench:queries in CI (soft gate, --update on intentional changes)
```

---

## Success metrics (re-benchmark targets)

| Query | Current p95 | Target p95 |
|-------|-------------|------------|
| `getAllVenueSlugs` | 1728ms | <50ms (cached) |
| `getCategoryCityCombinations` | 947ms | <100ms |
| `searchVenues.default` | 833ms | <150ms |
| `getCityHubSlugs` | 501ms | <100ms |
| `getCityHubData` | 432ms | <150ms |
| `searchVenues.withSearch` | 349ms | <150ms |
| Volatile queries | ~270–530ms | <80ms |
| Healthy queries | <80ms | unchanged |

---

## What NOT to do yet

- **Per-query micro-optimizations** before pool + indexes — wasted effort on volatile noise.
- **Caching everything** — only sitemap/aggregate reads; never cache user-specific dashboard data without TTL + invalidation.
- **Raw SQL rewrites** of healthy ~30ms queries — no ROI.
- **Read replicas** — solve index/cache gaps first; replica adds ops cost without fixing seq scans.
