# Directory Template Documentation

Welcome to the documentation for **Directory Template**, a reusable directory-app template. This application allows users to search for venues, view detailed information, and helps venue owners manage their presence.

## Table of Contents

- [Architecture & Tech Stack](./architecture.md)
- [Design System & Brand](./design-system.md)
- [SEO](./seo/)
    - [Audit Report — Aug 2026](./seo/audit-2026-08.md)
    - [SEO Strategy](./seo/strategy.md)
- [Features Documentation](./features/)
    - [Venue Discovery](./features/venue-discovery.md)
    - [Venue Profiles](./features/venue-profiles.md)
    - [Dashboard & Management](./features/dashboard-management.md)
    - [Content & i18n](./features/content-i18n.md)
    - [System Admin](./features/system-admin.md)
    - [Authentication](./features/authentication.md)
- [Database Schema](./database.md)

## Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- pnpm
- PostgreSQL database

### Installation

1.  Clone the repository.
2.  Install dependencies:

    ```bash
    pnpm install
    ```

3.  Set up environment variables (copy `.env.example` if available, otherwise ensure `DATABASE_URL` and other secrets are set).
4.  Run database migrations:

    ```bash
    pnpm db:generate
    # Apply migrations (check package.json for specific command, usually drizzle-kit push or similar)
    ```

### Running Development Server

Start the development server on `http://localhost:3000`:

```bash
pnpm dev
```

### Build for Production

Build the application for production:

```bash
pnpm build
```

Start the production server:

```bash
pnpm start
```
