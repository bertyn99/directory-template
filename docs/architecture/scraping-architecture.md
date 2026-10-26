# Scraping Architecture

## Overview

The scraping system uses a modular, service-based architecture: `server/jobs/` (orchestration) + `server/services/scraping/` (reusable services) + `server/services/scraping/sources/` (source adapters).

## Directory Structure

```
server/
├── jobs/                       # Orchestration layer
│   └── scrape-venues.ts         # Main multi-source scraping job
│
├── services/scraping/          # Reusable services
│   ├── browser.ts              # Browser management & retry logic
│   ├── parser.ts               # Data extraction functions
│   ├── storage.ts              # File operations & batch processing
│   ├── state.ts                # Redis state tracking
│   ├── rate-limit.ts           # Per-source rate limiting
│   ├── matching-batch.ts       # Batch matching
│   ├── activities.ts           # Activity matching helpers
│   └── sources/                # Source adapters (adapter pattern)
│       ├── registry.ts         # Source registration
│       ├── fitnesspark.ts
│       ├── masalledesport.ts
│       ├── fitnesspark.ts
│       └── masalledesport.ts
│
└── tasks/                      # Scheduled Nitro tasks
    └── venues-multi-source      # Runs daily at 03:00
```

## Architecture

### Jobs Layer (`server/jobs/`)

High-level orchestration that coordinates scraping workflows.

**Characteristics:**
- ✅ **Separation of concerns** - Uses reusable services
- ✅ **Error handling** - Comprehensive error tracking and metrics
- ✅ **Concurrency control** - Batch processing with limits
- ✅ **Retry logic** - Built into services layer
- ✅ **Metrics tracking** - Detailed progress reporting
- ✅ **Resource management** - Proper cleanup (browser, contexts)
- ✅ **Type safety** - TypeScript interfaces for all data

**Example: `server/jobs/scrape-venues.ts`**

```typescript
import { createContext } from "~/server/services/scraping/browser";
import { getActivitiesFromUrl } from "~/server/services/scraping/parser";
import { processBatch } from "~/server/services/scraping/storage";

export async function scrapeVenuesJob(): Promise<ScrapeMetrics> {
  // 1. Setup (browser context)
  // 2. Fetch activities (using parser service)
  // 3. Process cities in batches (using storage service)
  // 4. Track metrics and errors
  // 5. Cleanup resources
}
```

### Sources Layer (`server/services/scraping/sources/`)

Each source implements a standard adapter interface and is registered in `registry.ts`.

**Active sources:** fitnesspark, masalledesport (template reference adapters; each instantiation registers its own)

### Matching Pipeline

1. Scrape → `ingest.ts` → normalize + upsert into `venueSources`
2. `matching.ts` → rule-based + geocoding + AI matching
3. Unmatched → `matchCandidates` (PENDING) for admin review
4. Admin → approve/reject via `/admin/match-candidates/`

## Service Layer Details

### `server/services/scraping/browser.ts`

**Purpose:** Browser instance management and navigation.

**Key Functions:**
- `getBrowser()` - Singleton browser instance
- `createContext()` - Create new browser context
- `navigateWithRetry()` - Navigate with automatic retry (3 attempts)
- `extractNextData()` - Extract JSON from `__NEXT_DATA__` script tag
- `closeBrowser()` - Cleanup browser instance

**Features:**
- Automatic retry with exponential backoff
- Browser instance reuse (singleton)
- Proper error handling
- Resource cleanup

### `server/services/scraping/parser.ts`

**Purpose:** Extract structured data from web pages.

**Key Functions:**
- `getActivitiesFromUrl()` - Extract activities list
- `getCitiesForActivity()` - Extract cities for an activity
- `getPlacesForCity()` - Extract venues with pagination support

**Features:**
- Type-safe interfaces
- Automatic pagination handling
- Duplicate removal
- Error handling

### `server/services/scraping/storage.ts`

**Purpose:** File operations and batch processing.

**Key Functions:**
- `downloadImage()` - Download and save images
- `processBatch()` - Process items with concurrency control

**Features:**
- Concurrency limits (prevents overwhelming system)
- Error handling per item (doesn't stop entire batch)
- Batch processing utilities

## Best Practices

### ✅ DO

1. **Use the jobs layer** (`server/jobs/scrape-venues.ts`)
2. **Use services** for reusable functionality
3. **Track metrics** for monitoring
4. **Handle errors** gracefully
5. **Control concurrency** to avoid overwhelming the target site

### ❌ DON'T

1. **Don't mix** scraping logic with data persistence
2. **Don't skip** error handling
3. **Don't process** everything sequentially
4. **Don't forget** to cleanup resources

## Future Improvements

1. **Move persistence to queries layer**
   - Create `server/db/queries/scraping.ts`
   - Use consistent patterns with other queries

2. **Add more jobs**
   - `server/jobs/scrape-activities.ts` - Scrape activities
   - `server/jobs/update-venues.ts` - Update existing venues
   - `server/jobs/cleanup-duplicates.ts` - Remove duplicates

3. **Add monitoring**
   - Track scraping success rates
   - Monitor error patterns
   - Alert on failures

4. **Add tests**
   - Unit tests for services
   - Integration tests for jobs
   - E2E tests for full workflow
