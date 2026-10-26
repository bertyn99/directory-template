import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

interface Category {
  id: number
  name: string
  slug: string
  content: Record<string, string> | null
  image: string | null
  thematiqueId: number | null
}

describe('GET /api/categories', async () => {
  await setup({ server: true })

  it('returns categories with required properties', async () => {
    const result = await $fetch<{ data: Category[] }>('/api/categories')

    expect(result).toHaveProperty('data')
    expect(Array.isArray(result.data)).toBe(true)
  })

  it('each category has required fields', async () => {
    const result = await $fetch<{ data: Category[] }>('/api/categories')

    for (const category of result.data) {
      expect(category).toHaveProperty('id')
      expect(category).toHaveProperty('name')
      expect(category).toHaveProperty('slug')
      expect(typeof category.id).toBe('number')
      expect(typeof category.name).toBe('string')
      expect(typeof category.slug).toBe('string')
    }
  })

  it('accepts search query param', async () => {
    const result = await $fetch<{ data: Category[] }>('/api/categories', {
      query: { search: 'yoga' },
    })

    expect(result).toHaveProperty('data')
    expect(Array.isArray(result.data)).toBe(true)
  })
})
