# Architecture Documentation

This directory contains documentation for the backend architecture of the directory template application.

## Documents

- **[Backend Structure](./backend-structure.md)** - Comprehensive guide to the refactored backend architecture, including schema organization, queries layer, API endpoints, and scraping services.

- **[API Patterns](./api-patterns.md)** - Patterns and conventions for API endpoints, including request/response formats, error handling, authentication, and common endpoint templates.

- **[Scraping Architecture](./scraping-architecture.md)** - Detailed explanation of the scraping architecture, including the difference between `server/jobs/` (new) and `server/scrapping/` (legacy), migration status, and best practices.

## Quick Reference

### Key Concepts

1. **Modular Schemas** - Database schemas organized by domain (`core`, `location`, `venues`, `activities`)
2. **Queries Layer** - Typed data access functions with validation (`server/db/queries/`)
3. **API Endpoints** - Consistent structure with `{ data, meta }` responses
4. **Scraping Services** - Reusable services for web scraping with retry logic and concurrency control

### Import Patterns

```typescript
// Schema imports
import { venues, cities, activities } from "~~/server/db/schema";

// Query imports
import { searchVenues, getVenueBySlug } from "~~/server/db/queries/venues";

// Service imports
import { createContext, navigateWithRetry } from "~/server/services/scraping/browser";
```

### Response Format

All API endpoints return:
```typescript
{
  data: T,        // The actual data
  meta?: {        // Optional metadata
    totalCount?: number,
    page?: number,
    pageSize?: number,
    totalPages?: number
  }
}
```

## Related Documentation

- [Design System](../../docs/design-system.md) - Frontend design guidelines
- [Features](../../docs/features/) - Feature documentation
- [Cursor Rules](../../.cursor/rules/) - Development guidelines

