import {
  pgTable,
  serial,
  text,
  integer,
  varchar,
  decimal,
  index,
} from "drizzle-orm/pg-core";
import type { SQL} from "drizzle-orm";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

export const countries = pgTable(
  "countries",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    code: varchar("code", { length: 2 }).notNull().unique(),
    slug: varchar("slug", { length: 255 }).generatedAlwaysAs(
      (): SQL => sql`slugify(${countries.name})`
    ),
  },
  (table) => ({
    nameIndex: index("country_name_idx").on(table.name),
    codeIndex: index("country_code_idx").on(table.code),
    slugIndex: index("country_slug_idx").on(table.slug),
  })
);

export const cities = pgTable(
  "cities",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).generatedAlwaysAs(
      (): SQL => sql`slugify(${cities.name} || COALESCE('-' || ${cities.zip}, ''))`
    ),
    zip: varchar("zip", { length: 20 }),
    countryId: integer("country_id").references(() => countries.id, {
      onDelete: "cascade",
    }),
    lat: decimal("lat", { precision: 10, scale: 8 }),
    lng: decimal("lng", { precision: 11, scale: 8 }),
    /** City-proper population (top-30 cities only) — drives "biggest cities" ordering. */
    population: integer("population"),
    /** Cover image path (e.g. /img/cities/lyon.jpg), generated for top-30 cities. */
    cover: text("cover"),
  },
  (table) => {
    return {
      nameIndex: index("city_name_idx").on(table.name),
      slugIndex: index("city_slug_idx").on(table.slug),
      countryIdIndex: index("city_country_id_idx").on(table.countryId),
      countryNameIndex: index("city_country_id_name_idx").on(table.countryId, table.name),
    };
  }
);

export const addresses = pgTable(
  "addresses",
  {
    id: serial("id").primaryKey(),
    street1: varchar("street1", { length: 255 }).notNull(),
    street2: varchar("street2", { length: 255 }),
    cityId: integer("city_id")
      .notNull()
      .references(() => cities.id, {
        onDelete: "cascade",
      }),
    zip: varchar("zip", { length: 20 }).notNull(),
    lat: text("lat"),
    lng: text("lng"),
  },
  (table) => ({
    cityIndex: index("city_idx").on(table.cityId),
  })
);

export const insertCitySchema = createInsertSchema(cities);
export const insertCountrySchema = createInsertSchema(countries);
export const insertAddressSchema = createInsertSchema(addresses);

