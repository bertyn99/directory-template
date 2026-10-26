import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['app/**/*.{ts,vue}', 'server/**/*.{ts}', 'shared/**/*.{ts}'],
      exclude: [
        'test/**',
        'e2e/**',
        'node_modules/**',
        '.nuxt/**',
        '.output/**',
        '**/*.d.ts',
        '**/migrations/**',
        '**/seed.ts',
      ],
      reporter: ['text', 'html', 'lcov'],
    },
    onConsoleLog(log) {
      if (log.includes('[Vue warn]') || log.includes('[HMR]') || log.includes('[nuxt]')) {
        return false
      }
      return true
    },
    projects: [
      // ─── Layer 1: Unit Tests (Node env, fastest) ───────────────────────
      {
        resolve: {
          alias: {
            '~': fileURLToPath(new URL('./app', import.meta.url)),
            '~~': rootDir,
            '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
          },
        },
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
          environment: 'node',
          pool: 'threads',
          poolOptions: {
            threads: {
              minThreads: 1,
              useAtomics: true,
            },
          },
          isolate: false,
          fileParallelism: true,
          testTimeout: 5000,
          setupFiles: ['./test/setup/unit.ts'],
        },
      },

      // ─── Layer 2: Component Tests (Nuxt env, happy-dom) ────────────────
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/components/**/*.test.ts'],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: {
              rootDir,
              domEnvironment: 'happy-dom',
              overrides: {
                devtools: { enabled: false },
              },
            },
          },
          pool: 'threads',
          poolOptions: {
            threads: {
              minThreads: 1,
              maxThreads: 2,
              useAtomics: true,
            },
          },
          fileParallelism: false,
          testTimeout: 15000,
          hookTimeout: 30000,
          setupFiles: ['./test/setup/nuxt.ts'],
        },
      }),

      // ─── Layer 3: DB Integration Tests (node env, embedded PGlite) ──────
      // Replays server/db/migrations into an in-memory Postgres (PGlite) and
      // injects it through setDrizzleInstance(), so production query
      // functions run against the real schema without booting Nuxt/Nitro.
      // The former Nuxt-env lane booted a Nitro server and hit an ESM/CJS
      // interop cascade — those specs stay frozen in test/integration/api/.
      // Set DB_PERF=1 to include the indicative performance smoke suite.
      {
        resolve: {
          alias: {
            '~': fileURLToPath(new URL('./app', import.meta.url)),
            '~~': rootDir,
            '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
          },
        },
        test: {
          name: 'integration',
          include: ['test/integration/db/**/*.test.ts'],
          environment: 'node',
          pool: 'threads',
          poolOptions: {
            threads: { minThreads: 1, maxThreads: 2, useAtomics: true },
          },
          fileParallelism: false,
          testTimeout: 30000,
          hookTimeout: 60000,
        },
      },
    ],
  },
})
