import { createInsertSchema } from "drizzle-zod";
// Top-level insert schemas (kept here for backwards compatibility)
import { users } from "./auth";
import { venueCategories, franchises } from "./core";
import { subscriptions } from "./subscription";

// Re-export all tables
export * from "./core";
export * from "./location";
export * from "./venues";
export * from "./activities";
export * from "./auth";
export * from "./utils";
export * from "./venueSources";
export * from "./subscription";
export * from "./sources";
export * from "./matchCandidates";

// Re-export Zod insert schemas that were previously defined per-domain
export { insertCitySchema, insertCountrySchema, insertAddressSchema } from "./location";
export { insertVenueSchema, insertVenueWithAddressSchema } from "./venues";
export { insertEquipmentSchema, insertActivitySchema } from "./activities";
export { insertSourceSchema } from "./sources";
export { insertMatchCandidateSchema } from "./matchCandidates";

export const insertUserSchema = createInsertSchema(users);
export const insertTypeSchema = createInsertSchema(venueCategories);
export const insertFranchiseSchema = createInsertSchema(franchises);
export const insertSubscriptionSchema = createInsertSchema(subscriptions);
