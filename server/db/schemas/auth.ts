import {
    pgEnum,
    pgTable,
    uuid,
    text,
    varchar,
    boolean,
    integer,
    timestamp,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";

// =================================================================
// AUTHENTICATION SCHEMA (Following Lucia-auth & Auth.js conventions)
// =================================================================

export const authProviderEnum = pgEnum("auth_provider", [
    "credentials",
    "google",
    "facebook",
    "apple",
    "twitter",
    "github",
]);

// The core `users` table holds identity information.
export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: varchar("first_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }),
    username: varchar("username", { length: 255 }).notNull().unique(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    stripeCustomerId: text("stripe_customer_id").unique(),

    // App-specific user data
    avatarUrl: text("avatar_url"),
    onboardingStep: integer("onboarding_step").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    role: varchar("role", { length: 50 }).notNull().default("user"),
});

// The `accounts` table links OAuth providers to users.
export const accounts = pgTable(
    "accounts",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        provider: authProviderEnum("provider").notNull(),
        providerAccountId: text("provider_account_id").notNull(),
        userId: uuid("user_id")
            .references(() => users.id, { onDelete: "cascade" })
            .notNull(),
        // OAuth provider tokens
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        accessTokenExpiresAt: timestamp("expires_at", { withTimezone: true }),
        refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
            withTimezone: true,
        }),
        token_type: text("token_type"),
        scope: text("scope"),
        id_token: text("id_token"),
        hashedPassword: text("hashed_password"),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        index("accounts_user_id_idx").on(table.userId),
        uniqueIndex("accounts_provider_user_idx").on(table.provider, table.userId),
        uniqueIndex("accounts_provider_account_idx").on(table.provider, table.providerAccountId),
    ]
);

// The `sessions` table stores user sessions for authentication.
export const sessions = pgTable(
    "sessions",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .references(() => users.id, { onDelete: "cascade" })
            .notNull(),
        token: text("token").notNull(),
        userAgent: text("user_agent"),
        ipAddress: text("ip_address"),
        expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        index("sessions_user_id_idx").on(table.userId),
        uniqueIndex("sessions_token_idx").on(table.token),
        index("sessions_expires_at_idx").on(table.expiresAt),
    ]
);
