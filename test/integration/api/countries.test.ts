import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

interface Country {
  id: number
  name: string
  code: string
  slug: string
  cityCount: number
  totalVenues: number
}

describe('GET /api/countries', async () => {
  await setup({ server: true })

  it('returns countries with required properties', async () => {
    const result = await $fetch<{ countries: Country[] }>('/api/countries')

    expect(result).toHaveProperty('countries')
    expect(Array.isArray(result.countries)).toBe(true)
  })

  it('each country has required fields', async () => {
    const result = await $fetch<{ countries: Country[] }>('/api/countries')

    for (const country of result.countries) {
      expect(country).toHaveProperty('id')
      expect(country).toHaveProperty('name')
      expect(country).toHaveProperty('code')
      expect(country).toHaveProperty('slug')
      expect(typeof country.id).toBe('number')
      expect(typeof country.name).toBe('string')
      expect(typeof country.code).toBe('string')
      expect(typeof country.slug).toBe('string')
    }
  })

  it('each country has cityCount and totalVenues', async () => {
    const result = await $fetch<{ countries: Country[] }>('/api/countries')

    for (const country of result.countries) {
      expect(country).toHaveProperty('cityCount')
      expect(country).toHaveProperty('totalVenues')
      expect(typeof country.cityCount).toBe('number')
      expect(typeof country.totalVenues).toBe('number')
    }
  })
})
