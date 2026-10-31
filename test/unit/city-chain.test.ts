import { describe, expect, it } from 'vitest'
import {
  CITY_URL_PATTERN,
  buildChainCategoryPath,
  buildChainCategorySitemapAlternatives,
  categoryCityPath,
  categoryCityRedirectPath,
  cityHubPath,
  cityHubRedirectPath,
  legacyCityHubPath,
  resolveChainRouteParams,
  splitLocalePrefix,
} from '~~/shared/city-chain'
import { directoryConfig } from '~~/directory.config'

describe('cityHubPath / legacyCityHubPath (both patterns)', () => {
  it('builds the bare chain URL in country-city-category', () => {
    expect(cityHubPath('france', 'paris', 'country-city-category')).toBe('/france/paris')
    expect(legacyCityHubPath('france', 'paris', 'country-city-category')).toBe('/country/france/paris')
  })

  it('builds the /country-prefixed URL in category-city', () => {
    expect(cityHubPath('france', 'paris', 'category-city')).toBe('/country/france/paris')
    expect(legacyCityHubPath('france', 'paris', 'category-city')).toBe('/france/paris')
  })

  it('defaults to the config pattern and inverts it for legacy', () => {
    expect(cityHubPath('france', 'paris')).toBe(cityHubPath('france', 'paris', CITY_URL_PATTERN))
    expect(legacyCityHubPath('france', 'paris')).toBe(cityHubPath('france', 'paris', CITY_URL_PATTERN === 'country-city-category' ? 'category-city' : 'country-city-category'))
    expect(legacyCityHubPath('france', 'paris')).not.toBe(cityHubPath('france', 'paris'))
  })
})

describe('categoryCityPath (both patterns)', () => {
  it('emits the categories shape in category-city (country unused)', () => {
    expect(categoryCityPath('category-city', 'spa', 'france', 'paris')).toBe('/categories/spa/paris')
  })

  it('emits the country-first chain in country-city-category', () => {
    expect(categoryCityPath('country-city-category', 'spa', 'france', 'paris')).toBe('/france/paris/spa')
  })
})

describe('splitLocalePrefix', () => {
  it('strips an active non-default locale prefix', () => {
    // sample config: defaultLocale fr, locales [fr, en]
    expect(splitLocalePrefix('/en/france/paris')).toEqual({ prefix: '/en', segments: ['france', 'paris'] })
  })

  it('keeps unprefixed (default-locale) paths whole', () => {
    expect(splitLocalePrefix('/france/paris')).toEqual({ prefix: '', segments: ['france', 'paris'] })
    expect(splitLocalePrefix('/country/france/paris')).toEqual({ prefix: '', segments: ['country', 'france', 'paris'] })
  })

  it('never treats the default locale code or an unknown segment as a prefix', () => {
    expect(splitLocalePrefix('/fr/paris')).toEqual({ prefix: '', segments: ['fr', 'paris'] })
    expect(splitLocalePrefix('/xx/paris')).toEqual({ prefix: '', segments: ['xx', 'paris'] })
  })

  it('handles the root and empty paths', () => {
    expect(splitLocalePrefix('/')).toEqual({ prefix: '', segments: [] })
    expect(splitLocalePrefix('/en')).toEqual({ prefix: '/en', segments: [] })
  })
})

describe('resolveChainRouteParams (dispatcher vs chain param spellings)', () => {
  it('reads category/cities on the /categories dispatcher route', () => {
    expect(resolveChainRouteParams({ category: 'spa', cities: 'paris' })).toEqual({
      categorySlug: 'spa',
      citySlug: 'paris',
      countrySlug: undefined,
    })
  })

  it('reads country/city/category on the country-first chain route', () => {
    expect(resolveChainRouteParams({ country: 'france', city: 'paris', category: 'spa' })).toEqual({
      categorySlug: 'spa',
      citySlug: 'paris',
      countrySlug: 'france',
    })
  })

  it('decodes percent-encoded slugs and tolerates arrays/empties', () => {
    expect(resolveChainRouteParams({ category: 'spa', cities: 'paris-75011' }).citySlug).toBe('paris-75011')
    expect(resolveChainRouteParams({ category: ['spa', 'extra'], cities: undefined })).toEqual({
      categorySlug: 'spa',
      citySlug: undefined,
      countrySlug: undefined,
    })
    expect(resolveChainRouteParams({})).toEqual({ categorySlug: undefined, citySlug: undefined, countrySlug: undefined })
  })
})

describe('cityHubRedirectPath (shipped pattern: country-city-category)', () => {
  it('rewrites legacy /country/{c}/{x} to the bare chain, preserving the locale prefix', () => {
    expect(cityHubRedirectPath('/country/france/paris')).toBe('/france/paris')
    expect(cityHubRedirectPath('/en/country/france/paris')).toBe('/en/france/paris')
  })

  it('returns null for already-canonical bare chain URLs', () => {
    expect(cityHubRedirectPath('/france/paris')).toBeNull()
    expect(cityHubRedirectPath('/en/france/paris')).toBeNull()
  })

  it('leaves non-chain shapes alone', () => {
    expect(cityHubRedirectPath('/country')).toBeNull()
    expect(cityHubRedirectPath('/country/france')).toBeNull()
    expect(cityHubRedirectPath('/country/france/paris/spa')).toBeNull()
    expect(cityHubRedirectPath('/venues')).toBeNull()
    expect(cityHubRedirectPath('/')).toBeNull()
  })
})

describe('categoryCityRedirectPath (shipped pattern: country-city-category)', () => {
  it('rewrites the categories shape to the chain when the country is known', () => {
    expect(categoryCityRedirectPath('/categories/spa/paris', 'spa', 'france', 'paris')).toBe('/france/paris/spa')
    expect(categoryCityRedirectPath('/en/categories/spa/paris', 'spa', 'france', 'paris')).toBe('/en/france/paris/spa')
  })

  it('returns null for already-canonical chain URLs', () => {
    expect(categoryCityRedirectPath('/france/paris/spa', 'spa', 'france', 'paris')).toBeNull()
  })
})

describe('chain sitemap path builders', () => {
  it('prefixes non-default locales only (fr bare) and resolves locale category slugs', () => {
    expect(buildChainCategoryPath('fr', 'spa', 'france', 'paris')).toBe('/france/paris/spa')
    expect(buildChainCategoryPath('en', 'spa', 'france', 'paris')).toBe('/en/france/paris/spa')
  })

  it('emits hreflang alternates for every ACTIVE locale in the chain shape', () => {
    const alternatives = buildChainCategorySitemapAlternatives('spa', 'france', 'paris')
    expect(alternatives).toHaveLength(directoryConfig.locales.length)
    expect(alternatives.map(a => a.href)).toContain('https://example-directory.com/france/paris/spa')
    expect(alternatives.every(a => a.href.includes('/france/paris/'))).toBe(true)
  })
})
