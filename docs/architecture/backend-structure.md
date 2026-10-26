# Backend Architecture Documentation

## Overview

The backend has been refactored into a modular, maintainable structure following best practices for Nuxt server endpoints, Drizzle ORM, and scalable data access patterns.

## Directory Structure

```
server/
├── db/
│   ├── schema/              # Modular database schemas
│   │   ├── core.ts          # Core entities (users, types, franchises)
│   │   ├── location.ts      # Location entities (countries, cities, addresses)
│   │   ├── venues.ts         # Venue-related entities
│   │   ├── activities.ts    # Activity and equipment entities
│   │   ├── utils.ts         # Database utilities (slugify function)
│   │   └── index.ts         # Central export point with relations
│   ├── queries/             # Data access layer
│   │   └── venues.ts         # Venue-related queries
│   ├── service/             # Legacy service layer (deprecated)
│   └── seed.ts              # Database seeding
├── api/                     # API endpoints
│   ├── venues/               # Venue endpoints
│   ├── users/               # User endpoints
│   ├── cities/              # City endpoints
│   └── styles/              # Activity/style endpoints
├── services/                 # Reusable services
│   └── scraping/           # Web scraping utilities
│       ├── browser.ts        # Browser management
│       ├── parser.ts         # Data extraction
│       └── storage.ts        # File operations
├── jobs/                     # Background jobs
│   └── scrape-venues.ts      # Venue scraping job
└── utils/                    # Utility functions
    └── drizzle.ts            # Drizzle ORM setup
```

## Database Schema Architecture

### Modular Schema Organization

The database schema has been split into logical modules to improve maintainability:

#### `server/db/schema/core.ts`
Core application entities:
- `users` - User accounts
- `types` - Venue types
- `franchises` - Franchise organizations

#### `server/db/schema/location.ts`
Geographic entities:
- `countries` - Country data
- `cities` - City data with country relationships
- `addresses` - Physical addresses

#### `server/db/schema/venues.ts`
Venue-related entities:
- `venues` - Main venue entity
- `userVenues` - User-venue associations
- `formulas` - Pricing formulas
- `images` - Venue images
- `events` - Venue events
- `reviews` - User reviews
- `venueActivities` - Venue-activity junction table
- `venueEquipments` - Venue-equipment junction table

#### `server/db/schema/activities.ts`
Activity and equipment entities:
- `thematiques` - Activity themes/categories
- `activities` - Sport activities/styles
- `equipments` - Equipment types

#### `server/db/schema/utils.ts`
Database utilities:
- `createSlugifyFunction` - PostgreSQL function for URL-friendly slugs

#### `server/db/schema/index.ts`
Central export point that:
- Re-exports all tables from modules
- Defines cross-module relations
- Provides single import point: `~~/server/db/schema`

### Usage Example

```typescript
// Import from central index
import { venues, cities, activities } from "~~/server/db/schema";

// All tables and relations are available
const venue = await useDrizzle().query.venues.findFirst({
  with: {
    address: {
      with: {
        city: {
          with: {
            country: true,
          },
        },
      },
    },
    activities: {
      with: {
        activity: true,
      },
    },
  },
});
```

## Queries Layer

### Purpose

The queries layer (`server/db/queries/`) provides:
- Typed data access functions
- Input validation with Zod
- Consistent error handling
- Reusable query logic

### Structure

Each query module:
- Exports typed query functions
- Includes Zod schemas for input validation
- Returns consistent data structures
- Handles database errors gracefully

### Example: `server/db/queries/venues.ts`

```typescript
import { searchVenues, searchVenuesInputSchema } from "~~/server/db/queries/venues";

// Validated input
const input = searchVenuesInputSchema.parse(queryParams);

// Typed result
const result = await searchVenues(input);
// Returns: { venues: [...], totalCount: number, page: number, ... }
```

### Available Query Functions

#### `searchVenues(params: SearchVenuesInput)`
Search venues with filters:
- `search` - Text search in venue names
- `citySlug` - Filter by city
- `countrySlug` - Filter by country
- `activityIds` - Filter by activities
- `page`, `pageSize` - Pagination

Returns paginated results with metadata.

#### `getVenueBySlug(slug: string)`
Get a single venue by slug with full relations:
- Address with city and country
- Activities
- All venue details

#### `getCitiesWithVenueCountByActivitySlug(activitySlug: string, limit: number)`
Get cities that have venues for a specific activity, ordered by venue count.

#### `getUserVenues(userId: number)`
Get all venues associated with a user.

## API Endpoints

### Structure

API endpoints follow Nuxt conventions:
- File-based routing: `server/api/venues/[slug].ts`
- Default export handler: `defineEventHandler`
- Consistent response format: `{ data, meta }`

### Response Format

All endpoints return consistent structures:

**Success Response:**
```typescript
{
  data: T,           // The actual data
  meta?: {           // Optional metadata
    totalCount?: number,
    page?: number,
    pageSize?: number,
    totalPages?: number
  }
}
```

**Error Response:**
```typescript
{
  statusCode: number,
  statusMessage: string,
  data?: unknown      // Additional error details
}
```

### Endpoint Examples

#### `GET /api/venues`
Search venues with query parameters:
- `search` - Text search
- `city` - City slug filter
- `country` - Country slug filter
- `activities` - Comma-separated activity IDs
- `page` - Page number (default: 1)
- `limit` - Page size (default: 20)

**Implementation:**
```typescript
// server/api/venues/index.ts
import { searchVenues, searchVenuesInputSchema } from "~~/server/db/queries/venues";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const input = searchVenuesInputSchema.parse({...});
  const result = await searchVenues(input);
  
  return {
    data: result.venues,
    meta: {
      totalCount: result.totalCount,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    },
  };
});
```

#### `GET /api/venues/[slug]`
Get a single venue by slug.

#### `GET /api/styles/[slug]/cities`
Get cities with venue counts for an activity.

#### `GET /api/users/venues`
Get venues for the authenticated user (requires session).

### Error Handling

Endpoints use structured error handling:

```typescript
try {
  // ... logic
} catch (err: unknown) {
  const error = err as Error;
  
  // Re-throw H3 errors (like createError)
  if (error.name === "H3Error") {
    throw error;
  }
  
  // Handle validation errors
  if (error.name === "ZodError") {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid input",
      data: error,
    });
  }
  
  // Generic error
  throw createError({
    statusCode: 500,
    statusMessage: "Internal server error",
  });
}
```

## Scraping Architecture

### Service Layer

The scraping functionality is organized into reusable services:

#### `server/services/scraping/browser.ts`
Browser management:
- Singleton browser instance
- Context creation
- Retry logic for navigation
- JSON data extraction

**Features:**
- Automatic retry with exponential backoff
- Browser instance reuse
- Proper cleanup

#### `server/services/scraping/parser.ts`
Data extraction:
- `getActivitiesFromUrl()` - Extract activities list
- `getCitiesForActivity()` - Extract cities for an activity
- `getPlacesForCity()` - Extract venues with pagination support

**Features:**
- Handles pagination automatically
- Removes duplicates
- Type-safe interfaces

#### `server/services/scraping/storage.ts`
File operations:
- `downloadImage()` - Download and save images
- `processBatch()` - Process items with concurrency control

**Features:**
- Concurrency limits
- Error handling per item
- Batch processing

### Job Layer

#### `server/jobs/scrape-venues.ts`
Main scraping job:
- Orchestrates the scraping process
- Tracks metrics (activities, cities, venues processed)
- Error collection and reporting
- Concurrency control

**Usage:**
```typescript
import { scrapeVenuesJob } from "~/server/jobs/scrape-venues";

const metrics = await scrapeVenuesJob();
// Returns: { activitiesProcessed, citiesProcessed, venuesProcessed, errors }
```

**Features:**
- Processes cities in batches (configurable concurrency)
- Collects errors without stopping the job
- Provides detailed metrics
- Proper resource cleanup

## Data Flow

### Request Flow

```
Client Request
    ↓
API Endpoint (server/api/*)
    ↓
Input Validation (Zod schemas)
    ↓
Query Function (server/db/queries/*)
    ↓
Drizzle ORM (server/utils/drizzle.ts)
    ↓
PostgreSQL Database
```

### Scraping Flow

```
Scraping Job (server/jobs/scrape-venues.ts)
    ↓
Browser Service (server/services/scraping/browser.ts)
    ↓
Parser Service (server/services/scraping/parser.ts)
    ↓
Storage Service (server/services/scraping/storage.ts)
    ↓
Legacy Save Functions (server/scrapping/save_venue.ts)
    ↓
Database (via Drizzle ORM)
```

## Best Practices

### Schema Organization
- Group related tables in the same module
- Define relations in `index.ts` to avoid circular dependencies
- Use generated columns for slugs
- Export insert schemas for validation

### Query Functions
- Always validate input with Zod
- Return consistent data structures
- Handle errors gracefully
- Use Drizzle's query builder for complex queries

### API Endpoints
- Use query functions, not direct database access
- Return `{ data, meta }` structure
- Validate inputs at the endpoint level
- Provide meaningful error messages

### Scraping Services
- Use retry logic for network operations
- Implement concurrency controls
- Track metrics and errors
- Clean up resources properly

## Migration Notes

### From Old Structure

**Old:**
```typescript
import { venues, cities } from "~~/server/db/schema";
import { searchVenues } from "~~/server/db/service/venue";
```

**New:**
```typescript
import { venues, cities } from "~~/server/db/schema";
import { searchVenues } from "~~/server/db/queries/venues";
```

### Schema Imports

All schema imports now resolve through `server/db/schema/index.ts`:
- `~~/server/db/schema` → `server/db/schema/index.ts`
- All tables and relations available
- No need to import from individual modules

## Future Improvements

1. **Additional Query Modules**
   - `server/db/queries/cities.ts`
   - `server/db/queries/activities.ts`
   - `server/db/queries/users.ts`

2. **Scraping Migration**
   - Move all scraping logic to `server/services/scraping/`
   - Create query functions for scraping data persistence
   - Remove legacy `server/scrapping/` directory

3. **Testing**
   - Unit tests for query functions
   - Integration tests for API endpoints
   - E2E tests for scraping jobs

4. **Documentation**
   - API documentation (OpenAPI/Swagger)
   - Query function JSDoc comments
   - Architecture diagrams

