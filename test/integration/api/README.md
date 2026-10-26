// Frozen spec files.
//
// These integration tests boot a full Nitro server via @nuxt/test-utils/e2e,
// which trips the ESM/CJS interop cascade documented in vitest.config.ts when
// this project lived in the Nuxt environment. They were disabled rather than
// migrated and are NOT part of the active test matrix.
//
// The active DB-layer lane lives in ../db/ (embedded PGlite, plain node env).
// Candidates to rewrite later against route handlers + query functions.
