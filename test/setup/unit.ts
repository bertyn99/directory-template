// test/setup/unit.ts
// Lightweight setup for unit tests — Node environment, no DOM, no Nuxt runtime.
import { vi } from 'vitest'
import { ref } from 'vue'

// Mock Nuxt auto-imports that would fail in pure Node env.
// These are replaced at module resolution time so unit tests don't need Nuxt.
vi.mock('#imports', () => ({
  useDrizzle: vi.fn(),
  defineAbility: (fn: (...args: unknown[]) => boolean) => fn,
  navigateTo: vi.fn(() => Promise.resolve()),
  useRoute: vi.fn(() => ({ path: '/', params: {}, query: {} })),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  useState: vi.fn((_key?: string, init?: () => unknown) => ref(init ? init() : undefined)),
  useFetch: vi.fn(() => ({ data: { value: null }, pending: { value: false }, error: { value: null }, refresh: vi.fn() })),
  useAsyncData: vi.fn(() => ({ data: { value: null }, pending: { value: false }, error: { value: null }, refresh: vi.fn() })),
  useHead: vi.fn(),
  useSeoMeta: vi.fn(),
  useI18n: vi.fn(() => ({ t: (key: string) => key, locale: { value: 'fr' } })),
  useUserSession: vi.fn(() => ({ user: null, clear: vi.fn(), fetch: vi.fn() })),
  $fetch: vi.fn(),
  clearNuxtData: vi.fn(),
  refreshNuxtData: vi.fn(),
}))

// Mock #auth-utils
vi.mock('#auth-utils', () => ({
  defineAbility: (fn: (...args: unknown[]) => boolean) => fn,
}))

// Make defineAbility available globally for files that rely on Nuxt auto-imports
// (e.g. shared/utils/abilities.ts uses it without explicit import)
// @ts-expect-error — global auto-import shim for unit tests
globalThis.defineAbility = (fn: (...args: unknown[]) => boolean) => fn
