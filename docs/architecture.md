# Architecture & Tech Stack

## Technology Stack

This project is built using a modern full-stack web architecture centered around Nuxt.

-   **Framework:** [Nuxt](https://nuxt.com) (v4 compatibility mode enabled)
-   **Language:** TypeScript
-   **Database:** PostgreSQL
-   **ORM:** [Drizzle ORM](https://orm.drizzle.team)
-   **UI Library:** [Nuxt UI](https://ui.nuxt.com) (based on Tailwind CSS)
-   **Authentication:** `nuxt-auth-utils`
-   **Internationalization:** `@nuxtjs/i18n` (English & French)
-   **Content Management:** `@nuxt/content` (Markdown-based blog)
-   **Analytics:** `nuxt-umami`
-   **Validation:** `zod`

## Directory Structure

The project follows a standard Nuxt directory structure with some custom organization for the backend and content.

### `/app`
Contains the main frontend application logic.
-   `components/`: Vue components organized by domain.
    -   `base/`: Generic UI elements (Navbar, Header, Modals).
    -   `venue/`: Components specific to venue display (Card, List, Forms).
    -   `blog/`, `section/`, `sidebar/`: Layout and content sections.
    -   `modal/`: Application modals.
-   `pages/`: Application routes (file-system based routing).
    -   `index.vue`: Homepage.
    -   `venues/`: Venue listing and details.
    -   `dashboard/`: User and franchise management area.
    -   `auth/`: Login and registration pages.
-   `layouts/`: Page layouts (default, dashboard, auth).
-   `composables/`: Shared state logic (e.g., filters, map links).

### `/server`
Backend logic and API endpoints.

**📚 For detailed backend architecture documentation, see [Backend Structure](./architecture/backend-structure.md)**

-   `api/`: Nitro event handlers (API routes).
    -   `venues/`: Venue endpoints (search, details)
    -   `cities/`, `countries/`: Location endpoints
    -   `auth/`: Authentication endpoints
    -   `users/`: User-specific operations
    -   `styles/`: Activity/style endpoints
-   `db/`: Database configuration and data access.
    -   `schema/`: Modular schema definitions (see [Backend Structure](./architecture/backend-structure.md))
        -   `core.ts`: Core entities (users, types, franchises)
        -   `location.ts`: Geographic entities (countries, cities, addresses)
        -   `venues.ts`: Venue-related entities
        -   `activities.ts`: Activity and equipment entities
        -   `index.ts`: Central export with relations
    -   `queries/`: Data access layer
        -   `venues.ts`: Venue query functions with validation
    -   `migrations/`: SQL migration files
    -   `service/`: Legacy service layer (deprecated, use `queries/` instead)
-   `services/`: Reusable services
    -   `scraping/`: Web scraping utilities (browser, parser, storage)
-   `jobs/`: Background jobs
    -   `scrape-venues.ts`: Venue scraping job with retry logic
-   `utils/`: Server-side utilities
    -   `drizzle.ts`: Drizzle ORM setup

### `/content`
Markdown files for the application's content (e.g., Blog).
-   `en/blog/` & `fr/blog/`: Localized blog posts.

### `/i18n`
Internationalization configuration.
-   `locales/`: JSON translation files (`en.json`, `fr.json`).

### Root Files
-   `nuxt.config.ts`: Main configuration file.
-   `drizzle.config.ts`: Drizzle ORM configuration.
-   `package.json`: Project dependencies and scripts.

## Key Concepts

### Server-Side Rendering (SSR)
Nuxt handles SSR to improve SEO and initial load performance.

### Data Fetching
Data is fetched using Nuxt's `useFetch` or `$fetch`, communicating with the internal API routes defined in `/server/api`.

### Database Access
The application connects directly to PostgreSQL using Drizzle ORM. 

**Schema Organization:**
- Modular schemas organized by domain in `server/db/schema/`
- Central export point: `server/db/schema/index.ts`
- All imports use: `import { ... } from "~~/server/db/schema"`

**Data Access Layer:**
- Query functions in `server/db/queries/` provide typed, validated data access
- Input validation with Zod schemas
- Consistent error handling
- See [Backend Structure](./architecture/backend-structure.md) for details

### API Endpoints
All API endpoints follow a consistent structure:
- Use query functions from `server/db/queries/`
- Return `{ data, meta }` format
- Input validation with Zod
- Structured error handling

See [Backend Structure](./architecture/backend-structure.md) for examples and patterns.
