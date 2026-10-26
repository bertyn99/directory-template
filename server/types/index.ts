import type * as schema from "../db/schemas";

export type City = typeof schema.cities.$inferSelect;
export type Venue = typeof schema.venues.$inferSelect;
export type Country = typeof schema.countries.$inferSelect;
export type Address = typeof schema.addresses.$inferSelect;
export type Equipment = typeof schema.equipments.$inferSelect;
export type Activity = typeof schema.activities.$inferSelect;
export type Type = typeof schema.venueCategories.$inferSelect;
export type Franchise = typeof schema.franchises.$inferSelect;
export type Event = typeof schema.events.$inferSelect;
export type Theme = typeof schema.thematiques.$inferSelect;
export type Formulas = typeof schema.formulas.$inferSelect;
export type Review = typeof schema.reviews.$inferSelect;
export type User = typeof schema.users.$inferSelect;

// type for insert
export type InsertCity = typeof schema.cities.$inferInsert;
export type InsertCountry = typeof schema.countries.$inferInsert;
export type InsertAddress = typeof schema.addresses.$inferInsert;
export type InsertVenue = typeof schema.venues.$inferInsert;
export type InsertEquipment = typeof schema.equipments.$inferInsert;
export type InsertActivity = typeof schema.activities.$inferInsert;
export type InsertType = typeof schema.venueCategories.$inferInsert;
export type InsertFranchise = typeof schema.franchises.$inferInsert;
export type InsertEvent = typeof schema.events.$inferInsert;
export type InsertTheme = typeof schema.thematiques.$inferInsert;
export type InsertFormulas = typeof schema.formulas.$inferInsert;
export type InsertReview = typeof schema.reviews.$inferInsert;
