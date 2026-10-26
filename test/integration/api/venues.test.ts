import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('GET /api/venues', async () => {
  await setup({ server: true })

  it('returns venues with pagination metadata', async () => {
    const result = await $fetch<{ data: unknown[], meta: { totalCount: number, page: number, pageSize: number, totalPages: number } }>('/api/venues')

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('meta')
    expect(Array.isArray(result.data)).toBe(true)
    expect(result.meta).toHaveProperty('totalCount')
    expect(result.meta).toHaveProperty('page')
    expect(result.meta).toHaveProperty('pageSize')
    expect(result.meta).toHaveProperty('totalPages')
  })

  it('accepts page and pageSize query params', async () => {
    const result = await $fetch<{ data: unknown[], meta: { totalCount: number, page: number, pageSize: number, totalPages: number } }>('/api/venues', {
      query: { page: 1, limit: 5 },
    })

    expect(result.meta.page).toBe(1)
    expect(result.meta.pageSize).toBe(5)
  })

  it('accepts search query param', async () => {
    const result = await $fetch<{ data: unknown[], meta: { totalCount: number, page: number, pageSize: number, totalPages: number } }>('/api/venues', {
      query: { search: 'test' },
    })

    expect(result).toHaveProperty('data')
    expect(Array.isArray(result.data)).toBe(true)
  })

  it('returns 400 for invalid query parameters', async () => {
    await expect(
      $fetch('/api/venues', { query: { page: 'invalid' } }),
    ).rejects.toThrow()
  })
})
