# API Patterns & Conventions

## Request/Response Patterns

### Standard Response Format

All API endpoints return a consistent structure:

```typescript
// Success Response
{
  data: T,              // The actual data (array or object)
  meta?: {              // Optional metadata
    totalCount?: number,
    page?: number,
    pageSize?: number,
    totalPages?: number
  }
}

// Error Response (H3Error)
{
  statusCode: number,
  statusMessage: string,
  data?: unknown        // Additional error details
}
```

### Example Endpoint

```typescript
// server/api/venues/index.ts
import { searchVenues, searchVenuesInputSchema } from "~~/server/db/queries/venues";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    
    // 1. Parse and validate input
    const input = searchVenuesInputSchema.parse({
      page: query.page ? parseInt(query.page as string) : undefined,
      pageSize: query.limit ? parseInt(query.limit as string) : undefined,
      search: query.search as string | undefined,
      citySlug: query.city as string | undefined,
      countrySlug: query.country as string | undefined,
      activityIds: query.activities
        ? (query.activities as string).split(",").map(Number).filter(Boolean)
        : undefined,
    });

    // 2. Call query function
    const result = await searchVenues(input);

    // 3. Return consistent format
    return {
      data: result.venues,
      meta: {
        totalCount: result.totalCount,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    };
  } catch (err: unknown) {
    const error = err as Error;
    
    // Handle validation errors
    if (error.name === "ZodError") {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid query parameters",
        data: error,
      });
    }

    // Re-throw H3 errors
    if (error.name === "H3Error") {
      throw error;
    }

    // Generic error
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to search venues",
    });
  }
});
```

## Error Handling Pattern

### Error Types

1. **Validation Errors (400)**
   - Invalid input parameters
   - Missing required fields
   - Type mismatches

2. **Authentication Errors (401)**
   - Missing or invalid session
   - Expired tokens

3. **Authorization Errors (403)**
   - Insufficient permissions
   - Resource access denied

4. **Not Found Errors (404)**
   - Resource doesn't exist
   - Invalid ID/slug

5. **Server Errors (500)**
   - Unexpected errors
   - Database failures

### Error Handling Template

```typescript
export default defineEventHandler(async (event) => {
  try {
    // ... endpoint logic
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
    
    // Log unexpected errors
    console.error("Unexpected error:", error);
    
    // Return generic error
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});
```

## Authentication Pattern

### Protected Endpoints

```typescript
import { requireUserSession } from "#imports";

export default defineEventHandler(async (event) => {
  // Require authentication
  const session = await requireUserSession(event);
  
  // Use session.user.id, session.user.username, etc.
  const userId = session.user.id;
  
  // ... endpoint logic
});
```

### Optional Authentication

```typescript
import { getUserSession } from "#imports";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  
  if (session.user) {
    // User is authenticated
  } else {
    // Public access
  }
  
  // ... endpoint logic
});
```

## Query Parameters Pattern

### Pagination

```typescript
const query = getQuery(event);
const page = query.page ? parseInt(query.page as string) : 1;
const limit = query.limit ? parseInt(query.limit as string) : 20;
```

### Filters

```typescript
const query = getQuery(event);

// Single value
const citySlug = query.city as string | undefined;

// Array values (comma-separated)
const activityIds = query.activities
  ? (query.activities as string)
      .split(",")
      .map(Number)
      .filter(Boolean)
  : [];
```

### Validation

Always validate query parameters:

```typescript
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
});

const validatedQuery = querySchema.parse(getQuery(event));
```

## Route Parameters Pattern

### Dynamic Routes

```typescript
// server/api/venues/[slug].ts
export default defineEventHandler(async (event) => {
  const slug = event.context.params?.slug;
  
  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: "Slug is required",
    });
  }
  
  // ... use slug
});
```

### Nested Routes

```typescript
// server/api/styles/[slug]/cities.get.ts
export default defineEventHandler(async (event) => {
  const slug = event.context.params?.slug;
  const { limit = 12 } = getQuery(event);
  
  // ... use slug and limit
});
```

## Best Practices

1. **Always validate input** - Use Zod schemas from query functions
2. **Use query functions** - Don't access database directly in endpoints
3. **Return consistent format** - Always use `{ data, meta }` structure
4. **Handle errors properly** - Distinguish between error types
5. **Log errors** - Use `console.error` for unexpected errors
6. **Don't expose internals** - Return minimal error details to clients
7. **Use TypeScript** - Leverage types from query functions
8. **Document endpoints** - Add JSDoc comments for complex logic

## Common Patterns

### List Endpoint

```typescript
export default defineEventHandler(async (event) => {
  const input = listInputSchema.parse(getQuery(event));
  const result = await listItems(input);
  
  return {
    data: result.items,
    meta: {
      totalCount: result.totalCount,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    },
  };
});
```

### Detail Endpoint

```typescript
export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) throw createError({ statusCode: 400, statusMessage: "ID required" });
  
  const item = await getItemById(id);
  if (!item) throw createError({ statusCode: 404, statusMessage: "Not found" });
  
  return { data: item };
});
```

### Create Endpoint

```typescript
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const input = createInputSchema.parse(body);
  
  const item = await createItem(input);
  
  return { data: item };
});
```

### Update Endpoint

```typescript
export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  const body = await readBody(event);
  const input = updateInputSchema.parse(body);
  
  const item = await updateItem(id, input);
  if (!item) throw createError({ statusCode: 404, statusMessage: "Not found" });
  
  return { data: item };
});
```

### Delete Endpoint

```typescript
export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  
  const deleted = await deleteItem(id);
  if (!deleted) throw createError({ statusCode: 404, statusMessage: "Not found" });
  
  return { data: { success: true } };
});
```

