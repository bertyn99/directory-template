// test/setup/nuxt.ts
// Setup for component tests running in the Nuxt environment (happy-dom).
// The Nuxt runtime handles auto-imports, so we only set up global mocks here.
import { vi, afterAll } from 'vitest'

// Silence console.warn in component tests (Vue prop warnings, etc.)
const originalWarn = console.warn
console.warn = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : ''
  if (msg.includes('[Vue warn]') || msg.includes('Hydration')) return
  originalWarn(...args)
}

afterAll(() => { console.warn = originalWarn })

// Mock IntersectionObserver (not available in happy-dom)
if (typeof globalThis.IntersectionObserver === 'undefined') {
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
}

// Mock ResizeObserver
if (typeof globalThis.ResizeObserver === 'undefined') {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver
}

// Mock matchMedia (used by some Nuxt UI components)
if (typeof globalThis.matchMedia === 'undefined') {
  globalThis.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })
}

// Mock scrollTo (not available in happy-dom)
if (typeof globalThis.scrollTo === 'undefined') {
  globalThis.scrollTo = vi.fn()
}
