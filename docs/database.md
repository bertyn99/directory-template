# Database Schema

The application uses a relational database (PostgreSQL) managed via Drizzle ORM. Below is an overview of the core tables and their purpose.

## Core Entities

### Users (`users`)
Stores account information.
-   `id`, `username`, `email`, `password_hash`
-   `stripe_customer_id`: For payment integration.

### Franchises (`franchises`)
Represents a brand or organization that may own multiple venues.
-   `owner_id`: Links to the User who owns the franchise.
-   `description`, `social_media`

### Venues (`venues`)
The main entity representing a physical fighting venue.
-   `franchise_id`: Optional link to a franchise.
-   `type_id`: Type of venue.
-   `address_id`: Link to the physical location.
-   **Localized Fields:** `description`, `access`, `key_points` are stored as JSONB to support multiple languages (en, fr).
-   `opening_hours`, `planning`, `social_media`: JSONB fields for structured data.

## Location Data

### Countries (`countries`)
-   `name`, `code`, `slug`

### Cities (`cities`)
-   `country_id`: Link to Country.
-   `zip`, `lat`, `lng`

### Addresses (`addresses`)
-   `city_id`: Link to City.
-   `street1`, `lat`, `lng`: Exact location coordinates.

## Activities & Categorization

### Types (`types`)
Broad categories of venues.

### Thematiques (`thematiques`)
Themes or families of venue categories.

### Activities (`activities`)
Specific categories (e.g., Fitness, Yoga).
-   `thematique_id`: Links to the broader theme.
-   `content`, `techniques`: Localized details about the activity.

### Venue Activities (`venue_activities`)
Many-to-Many relationship table linking `venues` and `activities`.

## Additional Metadata

-   **Formulas (`formulas`):** Pricing plans linked to a venue.
-   **Equipments (`equipments`) & `venue_equipments`:** Facilities available at a venue.
-   **Reviews (`reviews`):** User ratings and comments for venues.
-   **Events (`events`):** Specific events hosted by venues.
