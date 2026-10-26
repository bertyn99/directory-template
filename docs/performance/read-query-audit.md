# Read Query Performance Audit

**Date:** 2026-06-30  
**Scope:** All database **read** paths — `server/db/queries/`, `server/api/` GET handlers, plugins, services, tasks.

## Goals

1. **Single source of truth** — every read query lives in `server/db/queries/{domain}.ts`, not in API routes.
2. **Measurable baselines** — each named query has recorded p50/p95 latency (`pnpm bench:queries`).
3. **Regression detection** — compare runs against `test/bench/baselines.json`.

---

## Query Layer Inventory

**54 bench cases** across 16 query files — every read function in `server/db/queries/` is registered in `read-registry.ts`.

| File | Read functions | In registry |
|------|----------------|-------------|
| `auth.ts` | `getUserByEmail`, `getUserByEmailOrUsername`, `findAccountCredentials` | 3 |
| `users.ts` | `getUserById` | 1 |
| `subscription.ts` | `getActiveSubscription`, `getSubscriptionByStripeId`, `getUserByStripeCustomerId` | 3 |
| `venues.ts` | `searchVenues`, `getVenueBySlug`, `getOwnedVenueBySlug`, `getCitiesWithVenueCountByActivitySlug`, `getMajorEuCitiesWithVenueCountByActivitySlug`, `getUserVenues`, `getAllVenueSlugs`, `getCityBySlug`, `getCategoryCityCombinations` | 11 |
| `cities.ts` | `getCityHubData`, `getNearbyCitiesWithVenues`, `getCityHubSlugs`, `getTopCitiesPerCountry`, `searchCities`, `getActivitiesByCitySlug` | 6 |
| `styles.ts` | `getAllActivitySlugs`, `listActivities`, `getActivityBySlug` | 4 |
| `venueRelations.ts` | `getVenueActivities`, `getVenueEquipments`, `getAllActivities`, `getAllEquipments` | 4 |
| `franchises.ts` | `getFranchisesByOwnerId`, `getFranchiseByIdAndOwnerId` | 2 |
| `franchiseVenues.ts` | `getFranchiseVenues`, `getFranchiseVenuesList`, `isFranchiseOwner` | 3 |
| `reviews.ts` | `getVenueReviews`, `getVenueAverageRating`, `getVenueReviewCount`, `getFranchiseReviews`, `getFranchiseAverageRating`, `getReviewsOverTime`, `getOwnerVenueReviews` | 7 |
| `analytics.ts` | `getOwnerVenueStats`, `getFranchiseStats` | 2 |
| `events.ts` | `getVenueEvents`, `getFranchiseEvents` | 2 |
| `images.ts` | `getVenueImages` | 1 |
| `formulas.ts` | `getVenueFormulas` | 1 |
| `countries.ts` | `getCountriesWithCounts`, `getCitiesByCountrySlug` | 3 |
| `matchCandidates.ts` | `getMatchCandidates`, `countMatchCandidates` | 2 |

| `venueSources` | `services/venues/*`, `tasks/venues-multi-source.ts` | P2 — batch jobs |
| `location` | `services/location/normalize.ts` | P2 |
| `userVenues` (ownership) | 15+ mutation endpoints | P2 — shared helper |

**Legacy duplicate:** `server/db/service/venue.ts` mirrors `searchVenues` — deprecate.

---

## GET Endpoint Compliance

All 29 GET handlers now delegate to `server/db/queries/`. Inline DB reads remain only in mutation endpoints, services, and tasks.

### Other read paths (not GET, but on hot paths)

| Location | Reads | Action |
|----------|-------|--------|
| `plugins/session.ts` | `users` + `subscriptions` on every session | Use `getUserById` + `getActiveSubscription`; consider `Promise.all` |
| `utils/stripe.ts` | Inline subscription lookup | Use `getActiveSubscription` |
| `services/venues/matching.ts` | Same `venueSource` fetched 3× per match | Batch + extract to `queries/venueSources.ts` |
| `services/location/normalize.ts` | Country/city/address lookups | `queries/location.ts` |
| `tasks/generate-category-content.ts` | All activities × all JSONB | Column-select in `queries/styles.ts` |

---

## Performance Issues

### N+1 / multi-round-trip

| Pattern | Location | Severity |
|---------|----------|----------|
| Same `venueSource` re-fetched 3× | `services/venues/matching.ts` | High |
| 3 sequential reads per venue | `api/users/venues/[slug].get.ts` | Medium |
| 2 reads per session | `plugins/session.ts` | Medium (every SSR) |
| 5+ sequential queries | `getCityHubData` | Medium |
| 2 queries per paginated list | `searchVenues`, `getVenueReviews` | Low (standard) |

### Missing pagination

| Function / endpoint | Risk |
|---------------------|------|
| `getUserVenues`, `getFranchiseReviews`, `users/reviews/venues` | Grows with owner activity |
| `getVenueEvents`, `getVenueImages`, `getVenueFormulas` | Per-venue growth |
| `styles/index`, `getAllActivities` | Full table + JSONB |
| `franchises/:id/venues` | Franchise size |

### Over-fetching

| Location | Problem |
|----------|---------|
| `styles/index.get.ts` | Full activity rows including `content`, `techniques` |
| `admin/match-candidates` | Deep nested address/country chains |
| `searchVenues` | Includes full `description` JSONB in list |
| `getFranchiseVenues` | `select()` all columns |

---

## Baseline Tooling

### Run benchmarks

```bash
# Requires DATABASE_URL (or TEST_DATABASE_URL)
pnpm bench:queries              # run + compare to baselines
pnpm bench:queries -- --update  # record new baselines
pnpm bench:queries -- --verbose # per-iteration output
```

Output: p50 / p95 / max per named query. Exit code 1 if p95 regresses >20% vs baseline.

### Dev slow-query logging

```bash
QUERY_TIMING=1 pnpm dev
```

Logs SQL statements exceeding `QUERY_TIMING_SLOW_MS` (default 50ms) to stderr.

### Registry

All benchable read queries are listed in `server/db/queries/read-registry.ts`.  
Add an entry when creating a new query function.

### Suggested initial targets (staging, realistic data)

See [optimization-plan.md](./optimization-plan.md) for the full phased plan derived from `test/bench/baselines.json`.

| Query | Current p95 (local) | Target p95 |
|-------|---------------------|------------|
| `getAllVenueSlugs` | 1728ms | <50ms (cached) |
| `getCategoryCityCombinations` | 947ms | <100ms |
| `searchVenues.default` | 833ms | <150ms |
| `getCityHubSlugs` | 501ms | <100ms |
| `getCityHubData` | 432ms | <150ms |
| `getVenueBySlug` | 70ms | <50ms |
| Session reads | ~38ms | <30ms (parallel fetch done) |

---

## Migration Plan

### Phase 1 — Instrument (done)

- [x] Audit document (this file)
- [x] `server/utils/queryTiming.ts`
- [x] `server/db/queries/read-registry.ts`
- [x] `scripts/bench-queries.ts` + `test/bench/baselines.json`

### Phase 2 — Extract inline reads (P1)

1. `queries/countries.ts` — countries listing + cities by slug
2. `queries/styles.ts` — `listActivities`, `getActivityBySlug` with column selection
3. `queries/venues.ts` — `getOwnedVenueBySlug` (venue + ownership + franchise in ≤2 queries)
4. Refactor `session.ts` to use existing user/subscription queries

### Phase 3 — Optimize hot paths

1. `getCityHubData` — reduce to ≤3 round-trips
2. `searchVenues` — drop `description` from list select; window count for pagination
3. `matching.ts` — dedupe `venueSource` fetches
4. Add pagination to owner dashboard reads

### Phase 4 — CI gate (optional)

- Re-enable integration Vitest project when ESM blocker resolves
- Add soft p95 thresholds in `test/bench/queries.bench.ts`

---

## Test Infrastructure Status

| Asset | Status |
|-------|--------|
| `test/setup/db.ts` | PG pool + transaction rollback |
| `test/helpers/db-seeder.ts` | Factory helpers |
| Integration Vitest project | **Disabled** (ESM/CJS — see `docs/test-known-issues.md`) |
| Query benchmarks | `pnpm bench:queries` (standalone script) |
