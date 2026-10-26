---
name: Multi-Source Club Scraping & Matching Plan
overview: ""
todos:
  - id: 588ba10a-43a3-404b-9b08-8d2e6b1467a2
    content: Add `sources`, `club_sources`, and optional `club_name_aliases` tables with Drizzle + Zod schemas and re-export them in the schema index.
    status: pending
  - id: fbed09b9-6174-48a7-ab19-b3a145acb955
    content: Introduce club scraping source types (`ScrapingSourceMeta`, `ScrapingSourceAdapter`), implement MAS adapter, and source registry.
    status: pending
  - id: 8656c011-2cb7-42a6-85f4-b4a30333a6bb
    content: Refactor `scrape-clubs` job to use source adapters, options (country/locale/sourceIds), and call ingestion instead of writing directly to clubs.
    status: pending
  - id: d1fd0f7b-e279-4465-aae0-613c003ccc44
    content: Implement club ingestion service that maps scraped `PlaceData` to `club_sources` and normalized addresses using Zod-validated DTOs.
    status: pending
  - id: 9e6a4acf-30a7-4987-90aa-b8ca8232d420
    content: Implement address normalization helpers and OpenStreetMap/Nominatim-based geocoding service, wiring it into address creation.
    status: pending
  - id: 2164bb72-34f9-4127-9ac0-65d318f36b49
    content: Implement club matching service combining rule-based matching, geocoding, and AI matcher hooks to link `club_sources` to canonical `clubs`.
    status: pending
  - id: 290f12ea-c950-421d-9121-5656a1bbcf32
    content: Define AI matcher interface and a stub implementation, then integrate it into the matching service with configurable thresholds.
    status: pending
  - id: 579dea70-c326-4033-897e-d321ec6133dc
    content: Add a task to run multi-source scrape + matching pipeline and update any relevant API routes or metrics as needed.
    status: pending
  - id: 6f36e4b2-9a67-4c0e-a514-6394376807a8
    content: Write basic tests for ingestion, matching, and geocoding, and update scraping architecture documentation to reflect the new pipeline.
    status: pending
---

# Multi-Source Club Scraping & Matching Plan

### 1. Data Model Extensions (DB Schema Layer)

- **Add `sources` table**
- Location: `server/db/schema/` (e.g. extend [`core.ts`](server/db/schema/core.ts) or create `sources.ts` and re-export in `index.ts`).
- Fields (initial): `id`, `code` (unique identifier like `masalledesport`), `name`, optional `countryId` (FK to `countries`), `defaultLocale`, `type` (e.g. `aggregator`, `federation`).
- Add appropriate indices on `code` and `countryId`.

- **Add `club_sources` table**
- Location: new file [`server/db/schema/clubSources.ts`](server/db/schema/clubSources.ts) or inside `clubs.ts` if you prefer to keep club-related tables together.
- Fields:
- `id` PK
- `sourceId` FK → `sources.id`
- `clubId` FK → `clubs.id` (nullable until matched)
- `sourceClubId` (ID/slug from source)
- `locale` (e.g. `fr`, `en-GB`)
- Denormalized fields for matching: `name`, `url`, `website`, `tel`, `addressId` FK → `addresses.id`
- `raw` JSONB for full original payload
- Indexes for matching & upserts: `(sourceId, sourceClubId)`, `(clubId)`, `(tel)`, `(website)`, `(addressId)`.

- **Optionally add `club_name_aliases` table** (for better matching/search)
- Location: `server/db/schema/clubs.ts` or separate file.
- Fields: `id`, `clubId` FK, `name`, `locale`, optional `sourceId`.
- Use this later to store alternative names from different sources/languages.

- **Zod schemas for new tables**
- Use `createInsertSchema` in the new schema files to define `insertSourceSchema`, `insertClubSourceSchema`, and optionally `insertClubNameAliasSchema`.
- Export these via [`server/db/schema/index.ts`](server/db/schema/index.ts) for use in services.

### 2. Scraping Source Abstraction (Services Layer)

- **Introduce generic source types for clubs**
- New file: [`server/services/scraping/sources/types.ts`](server/services/scraping/sources/types.ts).
- Define:
- `CountryCode` and `LocaleCode` enums/types aligned with your existing `countries.code` and language support.
- `ScrapingSourceMeta` with `id`, `name`, `baseUrl`, `countries`, `locales`.
- `ScrapingSourceAdapter` interface with:
- `meta: ScrapingSourceMeta`
- `getActivities(context)`
- `getCitiesForActivity(context, activity)`
- `getPlacesForCity(context, city, options?)` (reusing current `ActivityData`, `CityData`, `PlaceData`).

- **Wrap current MAS implementation as a `ScrapingSourceAdapter`**
- New file: [`server/services/scraping/sources/masalledesport.ts`](server/services/scraping/sources/masalledesport.ts).
- Implement `ScrapingSourceAdapter` by delegating to existing `getActivitiesFromUrl`, `getCitiesForActivity`, `getPlacesForCity` from [`parser.ts`](server/services/scraping/parser.ts).
- Set `meta.countries` to `['FR']` and `meta.locales` to `['fr-FR']`.

- **Add a source registry for clubs**
- New file: [`server/services/scraping/sources/registry.ts`](server/services/scraping/sources/registry.ts).
- Functions:
- `getAllSources()`
- `getSourceById(id: string)`
- `getSourcesByCountryAndLocale(country: CountryCode, locale?: LocaleCode)`
- Start by registering only `masalledesportSource`, keep API ready for more sources.

### 3. Club Scraping Job Refactor (Multi-Source, Country/Locale Aware)

- **Refactor `scrape-clubs` job to use adapters and emit per-source metrics**
- File: [`server/jobs/scrape-clubs.ts`](server/jobs/scrape-clubs.ts).
- Introduce:
- `ScrapeClubsJobOptions` with `sourceIds?`, `country?`, `locale?`, `activityIndex?`, `maxPagesPerCity?`.
- `ScrapeMetrics` extended to include `sourceId`, `country`, `locale`.
- Flow:

1. Create a single `BrowserContext` via `createContext()`.
2. Resolve list of `ScrapingSourceAdapter`s to run using the registry and options.
3. For each source:

- Fetch activities, pick activity (for now by `activityIndex`), fetch cities, then places.
- Instead of calling `addScrappedClubs` directly with raw places, call a new **ingestion service** (see next section) that writes into `club_sources`.

1. Keep existing concurrency via `processBatch` for cities.
2. Collect and return per-source `ScrapeMetrics[]`.

- **Keep current behavior as a default**
- Default options: country = `FR`, locale = `fr-FR`, and single source `masalledesport` to avoid breaking existing behavior.

### 4. Ingestion & Normalization Services (From Scrape to DB)

- **Create club ingestion service**
- New file: [`server/services/clubs/ingest.ts`](server/services/clubs/ingest.ts).
- Responsibilities:
- Input: `{ source: ScrapingSourceAdapter, activity, city, places: PlaceData[] }`.
- For each place:
- Build a `club_sources` insert payload with normalized fields:
- `sourceId` (from `sources` table; ensure you can map adapter `meta.id` → `sources.code`).
- `sourceClubId` (if any unique id in `PlaceData.raw` / URL).
- `locale` (from `source.meta.locales[0]` or per-place info if available).
- `name`, `url`, `website`, `tel`.
- Address extraction → `addresses` / `cities` / `countries` using existing schemas.
- `raw` = original `PlaceData`.
- Validate with `insertClubSourceSchema` (Zod) before writing.
- Upsert into `club_sources` using `(sourceId, sourceClubId)` as conflict target when available, or `(sourceId, url)` as fallback.
- Returns a list of `club_sources.id`s or summary metrics.

- **Add address normalization helper**
- New file: [`server/services/location/normalize.ts`](server/services/location/normalize.ts).
- Functions:
- `normalizeAddressFromPlace(place: PlaceData): NormalizedAddressInput` → `{ street1, street2?, zip, cityName, countryCode? }`.
- `upsertCityAndAddress(input)` → inserts/fetches city and address rows.
- Use Zod schemas (`insertCitySchema`, `insertAddressSchema`) to validate before DB calls.

### 5. Matching Pipeline (Clubbing `club_sources` into Canonical `clubs`)

- **Design a matching service that combines rules, geocoding, and AI hooks**
- New file: [`server/services/clubs/matching.ts`](server/services/clubs/matching.ts).
- Responsibilities:
- Given a `club_sources` record (new or updated):

1. **Rule-based candidates**

- Query `clubs` joined via `addresses`/`cities` for same `country` + same or similar city/ZIP.
- Filter by deterministic signals (normalized `tel`, `website`, `socialMedia` if you model it per-source later).

1. **Geocoding tier**

- Use geocoding service (see next section) to get `lat/lng` for the new address if missing.
- Compare with candidate clubs’ addresses; if distance < threshold (e.g. 50–100m) and at least one strong signal matches (tel/website), auto-match.

1. **AI matching tier (interface only, `ai_custom`)**

- If still ambiguous, construct a compact JSON with the source club and candidate(s) and pass to an **AI matcher interface** that returns `{ sameClub: boolean, confidence: number }`.
- Use thresholds to auto-link or mark for manual review.

1. **Create or link canonical club**

- If a confident match is found → set `club_sources.clubId` to existing `clubs.id`.
- Otherwise → create a new `clubs` row (canonical), filling available data and setting `club_sources.clubId` to it.

- **Expose Zod-validated DTOs for matching inputs**
- Add Zod schemas describing the shape passed to the AI matcher (small, stable JSON structure).
- This keeps the AI integration robust and auditable.

### 6. Geocoding Service (OpenStreetMap / Nominatim)

- **Create geocoding interface + OSM implementation**
- New file: [`server/services/location/geocoding.ts`](server/services/location/geocoding.ts).
- Define an interface:
- `geocodeAddress(input: { street: string; city: string; zip?: string; countryCode?: string }): Promise<{ lat: number; lng: number } | null>`.
- Implement using OpenStreetMap/Nominatim:
- Use `ofetch` or native fetch.
- Respect basic rate limiting (simple in-memory throttle per second/minute).
- Wrap with retries & error logging.
- Update `normalizeAddressFromPlace` / `upsertCityAndAddress` to optionally call `geocodeAddress` and store `lat`/`lng` on `addresses`.

### 7. AI Matching Interface & Gemini Implementation

- **Define an AI matcher interface backed by AI SDK + Gemini**
- New file: [`server/services/clubs/aiMatcher.ts`](server/services/clubs/aiMatcher.ts).
- Types:
- `ClubRecordForAI` (canonical shape derived from `club_sources` + address + country).
- `MatchResult` = `{ sameClub: boolean; confidence: number; reasons?: string }`.
- Interface:
- `matchClubs(sourceClub: ClubRecordForAI, candidate: ClubRecordForAI): Promise<MatchResult>`.

- **Implement `matchClubs` using AI SDK with Gemini**
- Initialize AI SDK Gemini client using environment variables (e.g. `AI_GEMINI_API_KEY`, `AI_GEMINI_MODEL`).
- Build a compact JSON payload with the two clubs (names, locales, tel, website, social handles if available, normalized address, lat/lng).
- Prompt Gemini with clear instructions and require a strict JSON response matching `MatchResult`.
- Parse and validate the response with Zod before returning to the caller; log and fall back to heuristic rules if validation fails.

- **Integrate AI matcher into the matching service**
- In [`matching.ts`](server/services/clubs/matching.ts), call `matchClubs` only when deterministic + geocoding rules did not produce a clear answer.
- Use configurable thresholds for auto-link vs. manual review and ensure errors from Gemini/AI SDK are handled gracefully (no breakage of the main pipeline).

### 8. API & Tasks Integration

- **Add a Nuxt task or script to run the multi-source scrape + match pipeline**
- Example task file: [`server/tasks/clubs-multi-source.ts`](server/tasks/clubs-multi-source.ts).
- Flow:
- Run `scrapeClubsJob({ country: 'FR', locale: 'fr-FR' })`.
- After ingesting to `club_sources`, trigger `matching` for new/updated records.
- Use existing patterns from other tasks in `server/tasks/`.

- **Optionally extend `server/api/clubs/index.ts` to expose source/meta info**
- Keep main API responses backed by canonical `clubs`, but consider returning aggregated info like `sourceCount` or `hasMultipleNames` for debugging.

### 9. Validation, Testing, and Migration Steps

- **Zod & type validation**
- Ensure all new services (ingestion, matching, geocoding) validate incoming payloads with Zod schemas created from Drizzle tables or dedicated DTO schemas.
- Add runtime guards where data comes from external sites (scrapers) or external APIs (geocoding).

- **Data migration**
- For existing MAS data currently written directly via `save_club.ts`:
- Create a one-off migration script under `server/tasks/` that:
- Reads existing clubs that were created from MAS.
- Backfills `sources` and `club_sources` records where possible.
- Or, if that’s too complex, start using `club_sources` only for new runs and leave old data as-is.

- **Testing strategy**
- Unit tests (or lightweight integration tests) for:
- `normalizeAddressFromPlace` → stable mapping from scraper data to address model.
- `geocodeAddress` wrapper (with mocks).
- Matching rules using synthetic `club_sources` + `clubs` data.
- Ingestion → `club_sources` insert/upsert with Zod validation.
- A small end-to-end dry run:
- Run MAS scraping on a limited sample.
- Confirm `club_sources`, `addresses`, `clubs` and linkages are created as expected.

### 10. Documentation Updates

- **Update scraping architecture docs**
- File: [`docs/architecture/scraping-architecture.md`](docs/architecture/scraping-architecture.md).
- Add sections describing:
- `sources` & `club_sources` tables.
- Source adapter pattern and registry.
- Ingestion → matching → canonical `clubs` pipeline.
- Where AI and geocoding plug in, and what’s currently implemented vs planned.

- **Add short dev notes**
- Document how to add a new source:
- Add `sources` row.
- Implement `ScrapingSourceAdapter`.
- Register in `registry.ts`.
- Ensure ingestion maps its `PlaceData` correctly into `club_sources`.