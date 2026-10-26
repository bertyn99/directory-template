// test/bun-test-stub.ts
// Stub for Bun's built-in test module — redirects to vitest APIs.
// Prevents Vite from failing when @nuxt/test-utils contains `import('bun:test')`.
import { vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'

export const mock = vi.fn
export { beforeAll, beforeEach, afterEach, afterAll }
