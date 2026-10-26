<template>
  <UContainer>
    <UBreadcrumb :items="breadcrumbItems" class="mb-6 pt-6" />

    <section class="relative mb-12 h-[360px] overflow-hidden rounded-sm border border-default md:h-[440px]">
      <NuxtImg
        :src="bannerSrc"
        :alt="t('categories.cityPage.heading', { category: categoryData?.name, city: cityDisplayName })"
        format="webp"
        width="1920"
        height="1080"
        sizes="sm:100vw md:100vw lg:1280px xl:1920px"
        loading="eager"
        fetchpriority="high"
        :preload="{ fetchPriority: 'high' }"
        class="absolute inset-0 h-full w-full object-cover"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/5" />
      <div class="relative z-10 flex h-full flex-col justify-end p-6 md:p-10">
        <div class="mb-3 h-1 w-10 bg-primary" aria-hidden="true" />
        <h1 class="font-display text-4xl font-black uppercase leading-[1.05] tracking-tight text-white md:text-6xl">
          {{ t('categories.cityPage.heading', { category: categoryData?.name, city: cityDisplayName }) }}
        </h1>
        <p class="mt-4 flex items-center gap-3 text-base text-white/85 md:text-lg">
          <UBadge color="primary" variant="solid" class="rounded-sm font-display text-sm font-black uppercase">
            {{ unfilteredCount }}
          </UBadge>
          {{ t('categories.cityPage.subheading', { categoryDe: categoryDe, city: cityDisplayName, count: unfilteredCount, category: categoryData?.name }) }}
        </p>
      </div>
    </section>

    <section class="mb-12 max-w-3xl">
      <p class="text-lg leading-relaxed text-default">
        {{ t('categories.cityPage.intro', { categoryDe: categoryDe, city: cityDisplayName, count: unfilteredCount, category: categoryData?.name }) }}
      </p>
      <p class="mt-4 text-lg leading-relaxed text-default">
        {{ t('categories.cityPage.introExtra', { categoryLe: categoryLe, city: cityDisplayName, category: categoryData?.name }) }}
      </p>
      <NuxtLink
v-if="categoryGuidePath" :to="categoryGuidePath"
        class="mt-4 inline-flex items-center gap-1.5 text-base font-semibold text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary">
        {{ t('categories.cityPage.guideLink', { category: categoryData?.name }) }}
        <UIcon name="i-lucide-arrow-right" class="size-4 shrink-0" aria-hidden="true" />
      </NuxtLink>
    </section>

    <section v-if="visibleNeighborhoods.length > 1" class="mb-10">
      <h2 class="font-display mb-2 text-2xl font-black uppercase tracking-tight text-default">
        {{ t('categories.cityPage.neighborhoodsTitle') }}
      </h2>
      <p class="mb-4 text-sm text-muted">{{ t('categories.cityPage.neighborhoodsHint') }}</p>
      <div class="flex flex-wrap gap-2">
        <UButton
          :color="selectedZip ? 'neutral' : 'primary'"
          :variant="selectedZip ? 'outline' : 'solid'"
          size="sm"
          class="rounded-sm font-semibold uppercase tracking-wide"
          @click="selectZip(undefined)"
        >
          {{ t('categories.cityPage.allNeighborhoods') }}
        </UButton>
        <UButton
          v-for="area in visibleNeighborhoods"
          :key="area.zip"
          :color="selectedZip === area.zip ? 'primary' : 'neutral'"
          :variant="selectedZip === area.zip ? 'solid' : 'outline'"
          size="sm"
          class="rounded-sm font-semibold uppercase tracking-wide"
          @click="selectZip(area.zip)"
        >
          {{ neighborhoodLabel(area.zip) }}
          <span class="ml-1 font-normal normal-case tracking-normal opacity-80">{{ area.venueCount }}</span>
        </UButton>
      </div>
    </section>

    <section v-if="venues.length > 0" class="py-4">
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <VenueCard v-for="(venue, i) in venues" :key="venue.id" :venue="venue" :rank="i + 1" />
      </div>
      <div v-if="totalPages > 1" class="mt-10 flex justify-center">
        <UPagination
          v-model:page="currentPage"
          :total="totalCount"
          :items-per-page="20"
          class="rounded-sm"
        />
      </div>
    </section>

    <section v-else-if="selectedZip" class="py-16 text-center">
      <UIcon name="i-heroicons-map-pin" class="mx-auto mb-4 h-16 w-16 text-muted" />
      <h2 class="font-display mb-2 text-2xl font-bold uppercase">
        {{ t('categories.cityPage.emptyFilterTitle') }}
      </h2>
      <p class="mb-6 text-muted">
        {{ t('categories.cityPage.emptyFilterDescription', { category: categoryData?.name }) }}
      </p>
      <UButton color="primary" variant="outline" class="rounded-sm" @click="selectZip(undefined)">
        {{ t('categories.cityPage.resetFilter') }}
      </UButton>
    </section>

    <section v-else class="py-16 text-center">
      <UIcon name="i-heroicons-magnifying-glass" class="mx-auto mb-4 h-16 w-16 text-muted" />
      <h2 class="font-display mb-2 text-2xl font-bold uppercase">
        {{ t('categories.cityPage.emptyTitle', { categoryDe: categoryDe, city: cityDisplayName, category: categoryData?.name }) }}
      </h2>
      <p class="mb-6 text-muted">
        {{ t('categories.cityPage.emptyDescription', { categoryDe: categoryDe, city: cityDisplayName, category: categoryData?.name }) }}
      </p>
    </section>

    <section class="border-t border-default py-14">
      <h2 class="font-display mb-8 flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-default">
        <span class="h-1 w-6 shrink-0 bg-primary" aria-hidden="true" />
        {{ t('categories.cityPage.chooseTitle') }}
      </h2>
      <div class="grid gap-8 rounded-sm border border-default bg-muted p-6 md:grid-cols-3 md:gap-0 md:divide-x md:divide-default md:p-8">
        <div class="md:pr-8">
          <h3 class="font-display mb-2 text-lg font-black uppercase tracking-wide text-primary">
            {{ t('categories.cityPage.chooseLocationTitle') }}
          </h3>
          <p class="text-sm leading-relaxed text-default">{{ t('categories.cityPage.chooseLocationBody') }}</p>
        </div>
        <div class="md:px-8">
          <h3 class="font-display mb-2 text-lg font-black uppercase tracking-wide text-primary">
            {{ t('categories.cityPage.chooseVisitTitle') }}
          </h3>
          <p class="text-sm leading-relaxed text-default">{{ t('categories.cityPage.chooseVisitBody') }}</p>
        </div>
        <div class="md:pl-8">
          <h3 class="font-display mb-2 text-lg font-black uppercase tracking-wide text-primary">
            {{ t('categories.cityPage.chooseStyleTitle') }}
          </h3>
          <p class="text-sm leading-relaxed text-default">
            {{ t('categories.cityPage.chooseStyleBody', { categoryLe: categoryLe, category: categoryData?.name }) }}
          </p>
        </div>
      </div>
    </section>

    <section class="border-t border-default bg-muted py-10">
      <h2 class="font-display mb-6 text-2xl font-black uppercase tracking-tight text-default">
        {{ t('categories.cityPage.faqTitle') }}
      </h2>
      <UAccordion
        :items="faqItems"
        default-value="start"
        :ui="{
          item: 'border-b border-default last:border-b-0',
          trigger: 'rounded-sm py-5 font-display text-base font-bold uppercase tracking-wide text-default hover:text-primary transition-colors duration-150',
          body: 'max-w-3xl pb-5 text-base leading-relaxed text-default',
          trailingIcon: 'size-5 text-primary',
          label: 'text-start',
        }"
      >
        <template #leading="{ index }">
          <span class="w-8 shrink-0 font-display text-sm font-bold text-primary">
            {{ String(index + 1).padStart(2, '0') }}
          </span>
        </template>
      </UAccordion>
    </section>


    <section v-if="countryCityLinks.length" class="border-t border-default py-14">
      <h2 class="font-display mb-8 flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-default">
        <span class="h-1 w-6 shrink-0 bg-primary" aria-hidden="true" />
        {{ countryCitiesTitle }}
      </h2>
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <NuxtLink
          v-for="city in countryCityLinks"
          :key="city.name"
          :to="localePath(`/categories/${categoryLocaleSlug}/${city.name.toLowerCase().replace(/\s+/g, '-')}`)"
          class="group relative h-36 overflow-hidden rounded-sm border border-default transition-colors duration-150 hover:border-primary"
          :class="{ 'bg-secondary': !city.cover }"
        >
          <template v-if="city.cover">
            <NuxtImg
              :src="city.cover"
              :alt="city.name"
              format="webp"
              width="400"
              height="240"
              sizes="200px"
              class="h-full w-full object-cover transition-transform duration-150 group-hover:scale-105"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          </template>
          <span
            v-else
            class="pointer-events-none absolute inset-0 flex items-center justify-center font-display text-7xl font-black uppercase text-white/5 select-none"
            aria-hidden="true"
          >
            {{ city.name.charAt(0) }}
          </span>
          <div class="absolute inset-x-0 bottom-0 p-3">
            <p class="font-display text-lg font-black uppercase text-white">{{ city.name }}</p>
            <p class="text-xs text-white/80">{{ t('categories.cityPage.venueCount', { count: city.venueCount }) }}</p>
          </div>
        </NuxtLink>
      </div>
    </section>

    <section v-if="otherCityLinks.length" class="py-14">
      <h2 class="font-display mb-8 flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-default">
        <span class="h-1 w-6 shrink-0 bg-primary" aria-hidden="true" />
        {{ t('categories.cityPage.otherCitiesTitle', { category: categoryData?.name }) }}
      </h2>
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <NuxtLink
          v-for="city in otherCityLinks"
          :key="city.name"
          :to="localePath(`/categories/${categoryLocaleSlug}/${city.name.toLowerCase().replace(/\s+/g, '-')}`)"
          class="group relative h-36 overflow-hidden rounded-sm border border-default transition-colors duration-150 hover:border-primary"
        >
          <NuxtImg
            :src="majorEuCityImageSrc(city.name)"
            :alt="city.name"
            format="webp"
            width="400"
            height="240"
            sizes="200px"
            class="h-full w-full object-cover transition-transform duration-150 group-hover:scale-105"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          <div class="absolute inset-x-0 bottom-0 p-3">
            <p class="font-display text-lg font-black uppercase text-white">{{ t('eu_city_names.' + city.name, city.name) }}</p>
            <p class="text-xs text-white/80">{{ t('categories.cityPage.venueCount', { count: city.venueCount }) }}</p>
          </div>
        </NuxtLink>
      </div>
    </section>

    <section class="mb-10 overflow-hidden rounded-sm bg-primary">
      <div class="flex flex-col gap-4 px-6 py-7 md:flex-row md:items-center md:justify-between md:px-8">
        <p class="font-display text-xl font-black uppercase tracking-tight text-white md:text-2xl">
          {{ t('categories.cityPage.closeLead', { categoryLeCap: categoryLeCap, city: cityDisplayName, category: categoryData?.name }) }}
        </p>
        <UButton
          :to="localePath(`/categories/${categoryLocaleSlug}`)"
          color="neutral"
          variant="solid"
          class="rounded-sm shrink-0 bg-white text-primary hover:bg-white/90 active:translate-y-px"
        >
          {{ t('categories.cityPage.closeCta', { category: categoryData?.name }) }}
        </UButton>
      </div>
    </section>
  </UContainer>
</template>

<script setup lang="ts">
import type { Activity } from '~~/server/types'
import {
  findActivityDefinitionForRow,
  getActivityLocaleSlug,
} from '~~/shared/activities'
import {
  formatParisArrondissement,
  majorEuCityFromPublicSlug,
  majorEuCityImageSrc,
} from '~~/shared/major-eu-cities'
import {
  RESERVED_SUBTOPIC_SLUGS,
  resolveContentLocale,
  categoryGuidesCollectionName,
} from '~~/shared/silo'

interface CategoryCityVenue {
  id: number
  name: string
  slug: string
}

interface NeighborhoodCount {
  zip: string
  venueCount: number
}

interface MajorCityCard {
  name: string
  venueCount: number
  /** Cover image path — set for top-30 cities by generate:city-covers. */
  cover?: string | null
}

interface CountryCitiesPayload {
  eu: MajorCityCard[]
  country: { code: string; cities: MajorCityCard[] } | null
  /** Canonical name slug for the requested city (zip/alias variants 301 to it). */
  canonicalCitySlug?: string | null
}

interface VenuesListMeta {
  totalCount: number
  totalPages: number
  neighborhoods?: NeighborhoodCount[]
}

const MAX_NEIGHBORHOOD_CHIPS = 16

const route = useRoute()

await useCategoryRouteI18n()
const { t, locale, te } = useI18n()
const localePath = useLocalePath()
const siteConfig = useSiteConfig()

function absoluteUrl(path: string) {
  return new URL(path, String(siteConfig.url || 'https://example-directory.com')).href
}

const categorySlug = computed(() => route.params.category as string)
const citySlug = computed(() => route.params.cities as string)

// Reserved subtopic slugs are served by static sibling routes (guide.vue,
// choisir-venue.vue, ecoles.vue). Guard here so a slug collision can never
// render an empty city page (belt-and-braces — static routes win first).
if (RESERVED_SUBTOPIC_SLUGS.has(citySlug.value)) {
  throw createError({ statusCode: 404, statusMessage: 'Not found' })
}
const canonicalSlug = computed(() => {
  if (!categoryData.value) return categorySlug.value
  return findActivityDefinitionForRow(categoryData.value)?.slug ?? categoryData.value.slug
})

const categoryLocaleSlug = computed(() =>
  getActivityLocaleSlug(canonicalSlug.value, locale.value) ?? categorySlug.value,
)

const selectedZip = computed(() => {
  const zip = route.query.zip
  return typeof zip === 'string' && zip.length > 0 ? zip : undefined
})

const currentPage = computed({
  get: () => Number(route.query.page) || 1,
  set: (val) => {
    navigateTo({
      path: route.path,
      query: {
        ...route.query,
        page: val > 1 ? val.toString() : undefined,
      },
    })
  },
})

const { data: categoryData, error: categoryError } = await useAsyncData(`category-${categorySlug.value}`, async () => {
  const resp = await $fetch<{ category: Activity }>(`/api/categories/${categorySlug.value}`, { query: { locale: locale.value } })
  return resp.category
})

if (categoryError.value) {
  throw createError({
    statusCode: categoryError.value.statusCode || 500,
    statusMessage: categoryError.value.statusMessage || 'Failed to load category',
  })
}

if (!categoryData.value) {
  throw createError({ statusCode: 404, statusMessage: 'Category not found' })
}

// Everything below keys off canonicalSlug (derived from categoryData), so these
// three fetches are data-independent of each other — start them together and
// await the handlers (SSR waits for all three). Handlers are kept for the
// await; the typed refs are destructured off each one.
const categoryGuideQuery = useAsyncData(
  `city-category-guide-${resolveContentLocale(locale.value)}-${canonicalSlug.value}`,
  async () => {
    try {
      return await queryCollection(categoryGuidesCollectionName(resolveContentLocale(locale.value)))
        .where('style', '=', canonicalSlug.value)
        .where('type', '=', 'guide')
        .first()
    } catch {
      return null // no guide published for this category/locale
    }
  },
)
const { data: categoryGuideEntry } = categoryGuideQuery
const venuesQuery = useAsyncData(
  () => `venues-${categorySlug.value}-${citySlug.value}-${currentPage.value}-${selectedZip.value ?? 'all'}`,
  () => $fetch<{ data: CategoryCityVenue[], meta: VenuesListMeta }>('/api/venues', {
    query: {
      city: citySlug.value,
      activities: canonicalSlug.value,
      page: currentPage.value,
      limit: 20,
      ...(selectedZip.value ? { zip: selectedZip.value } : {}),
    },
  }),
  { watch: [currentPage, selectedZip] },
)
const { data: venuesData } = venuesQuery
const citiesQuery = useAsyncData(
  `cities-${categorySlug.value}-${citySlug.value}`,
  () => $fetch<{ data: CountryCitiesPayload }>(`/api/categories/${canonicalSlug.value}/cities`, {
    query: { city: citySlug.value },
  }),
  { transform: (resp) => resp.data },
)
const { data: otherCities } = citiesQuery
await Promise.all([categoryGuideQuery, venuesQuery, citiesQuery])

// Silo depth (content-architecture §7): link the city page to the category's
// comprehensive guide when one is published for this locale. Categories without
// a guide keep the page unchanged. MUST come after categoryData (canonicalSlug
// reads it — a top-level await above the declaration would hit the TDZ).
const categoryGuidePath = computed(() =>
  categoryGuideEntry.value ? localePath(`/categories/${categoryLocaleSlug.value}/guide`) : null,
)

const cityName = computed(() => {
  return majorEuCityFromPublicSlug(citySlug.value)
    ?? citySlug.value.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
})

// Display name (localized: Londres/Lisbonne/Barcelone in fr). Slug-exclusion
// logic and arrondissement formatting keep using the canonical cityName.
const cityDisplayName = computed(() => t(`eu_city_names.${cityName.value}`, cityName.value))

const bannerSrc = computed(() => {
  const major = majorEuCityFromPublicSlug(citySlug.value)
  if (major) return majorEuCityImageSrc(major)
  return categoryData.value?.image ? `/${categoryData.value.image}` : '/img/cities/paris.jpg'
})

// French elision for category names: "l'Aquatique" / "d'Aquatique" instead of
 // "le Aquatique" / "de Aquatique". Non-French locales keep plain {category}.
const STYLE_VOWEL_START = /^[aeiouyàâäéèêëîïôöùûüœ]/i
const categoryName = computed(() => categoryData.value?.name ?? '')
const categoryLe = computed(() =>
  STYLE_VOWEL_START.test(categoryName.value) ? `l'${categoryName.value}` : `le ${categoryName.value}`,
)
const categoryLeCap = computed(() => {
  const value = categoryLe.value
  return value.charAt(0).toUpperCase() + value.slice(1)
})
const categoryDe = computed(() =>
  STYLE_VOWEL_START.test(categoryName.value) ? `d'${categoryName.value}` : `de ${categoryName.value}`,
)

// Canonicalize city URLs: zip variants (paris-75011) and aliases (lisboa)
// 301 to the name slug, consolidating signals on one URL per category+city.
const canonicalCitySlug = otherCities.value?.canonicalCitySlug ?? null
if (canonicalCitySlug && canonicalCitySlug !== citySlug.value) {
  await navigateTo(
    localePath(`/categories/${categoryLocaleSlug.value}/${canonicalCitySlug}`),
    { redirectCode: 301, replace: true },
  )
}
const venues = computed(() => venuesData.value?.data ?? [])
const totalCount = computed(() => venuesData.value?.meta.totalCount ?? 0)
const totalPages = computed(() => venuesData.value?.meta.totalPages ?? 1)
const neighborhoods = computed(() => venuesData.value?.meta.neighborhoods ?? [])
const unfilteredCount = computed(() => {
  // Without a zip filter, totalCount is the true city total (includes zip-less venues).
  // With a zip filter, totalCount is zip-scoped, so fall back to the citywide
  // neighborhood breakdown (zip-less venues are unknown in that mode).
  if (!selectedZip.value) return totalCount.value
  return neighborhoods.value.reduce((sum, area) => sum + area.venueCount, 0) || totalCount.value
})

const visibleNeighborhoods = computed(() => {
  const all = neighborhoods.value
  if (all.length <= MAX_NEIGHBORHOOD_CHIPS) return all
  const top = all.slice(0, MAX_NEIGHBORHOOD_CHIPS)
  const zip = selectedZip.value
  if (zip && !top.some(area => area.zip === zip)) {
    const selected = all.find(area => area.zip === zip)
    if (selected) return [...top.slice(0, MAX_NEIGHBORHOOD_CHIPS - 1), selected]
  }
  return top
})

const otherCityLinks = computed(() => {
  // The URL slug may be an alias ("lisboa") or zip-prefixed ("paris-75011");
  // cityName resolves to the canonical name via majorEuCityFromPublicSlug, so
  // compare against both forms to keep the current city out of the grid.
  const currentNameSlug = cityName.value.toLowerCase().replace(/\s+/g, '-')
  return (otherCities.value?.eu ?? []).filter(city => {
    const nameSlug = city.name.toLowerCase().replace(/\s+/g, '-')
    return nameSlug !== citySlug.value && nameSlug !== currentNameSlug
  })
})

const countryInfo = computed(() => otherCities.value?.country ?? null)

const countryCityLinks = computed(() => {
  // Same current-city exclusion as otherCityLinks (server already excludes by
  // canonical name; this guards alias/zip slug variants).
  const currentNameSlug = cityName.value.toLowerCase().replace(/\s+/g, '-')
  return (countryInfo.value?.cities ?? []).filter(city => {
    const nameSlug = city.name.toLowerCase().replace(/\s+/g, '-')
    return nameSlug !== citySlug.value && nameSlug !== currentNameSlug
  })
})

const countryCitiesTitle = computed(() => {
  const info = countryInfo.value
  if (!info) return ''
  const country = t(`country_names.${info.code}`, info.code)
  // French preposition varies per country (de / d' / du / des) — provided via
  // the country_prep locale map; fall back to a generic title when missing.
  const prep = te(`country_prep.${info.code}`) ? t(`country_prep.${info.code}`) : ''
  if (!prep) {
    return t('categories.cityPage.countryCitiesTitleGeneric', {
      category: categoryData.value?.name,
      country,
    })
  }
  return t('categories.cityPage.countryCitiesTitle', {
    category: categoryData.value?.name,
    country,
    prep,
  })
})

function neighborhoodLabel(zip: string): string {
  if (cityName.value === 'Paris') {
    const n = formatParisArrondissement(zip)
    if (n === 1) return t('categories.cityPage.arrondissementFirst')
    if (n) return t('categories.cityPage.arrondissement', { n })
  }
  return zip
}

function selectZip(zip: string | undefined) {
  const query = { ...route.query, page: undefined }
  if (zip) {
    query.zip = zip
  } else {
    delete query.zip
  }
  navigateTo({ path: route.path, query })
}

const faqItems = computed(() => {
  const vars = { category: categoryData.value?.name, city: cityDisplayName.value, categoryLe: categoryLe.value, categoryDe: categoryDe.value }
  return [
    { label: t('categories.cityPage.faq.start.q', vars), content: t('categories.cityPage.faq.start.a', vars), value: 'start' },
    { label: t('categories.cityPage.faq.level.q', vars), content: t('categories.cityPage.faq.level.a', vars), value: 'level' },
    { label: t('categories.cityPage.faq.licence.q', vars), content: t('categories.cityPage.faq.licence.a', vars), value: 'licence' },
    { label: t('categories.cityPage.faq.area.q', vars), content: t('categories.cityPage.faq.area.a', vars), value: 'area' },
    { label: t('categories.cityPage.faq.price.q', vars), content: t('categories.cityPage.faq.price.a', vars), value: 'price' },
    { label: t('categories.cityPage.faq.equipment.q', vars), content: t('categories.cityPage.faq.equipment.a', vars), value: 'equipment' },
  ]
})

// Hide the count below 5: "(2)" reads as scarcity and depresses CTR (YGG-196).
const pageTitle = computed(() => unfilteredCount.value >= 5
  ? t('categories.cityPage.seoTitle', { category: categoryData.value?.name, city: cityDisplayName.value, count: unfilteredCount.value })
  : t('categories.cityPage.seoTitleFew', { category: categoryData.value?.name, city: cityDisplayName.value }))
const pageDescription = computed(() => t('categories.cityPage.seoDescription', {
  categoryDe: categoryDe.value,
  category: categoryData.value?.name,
  city: cityDisplayName.value,
  count: unfilteredCount.value,
}))

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogImage: bannerSrc,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  keywords: computed(() => t('categories.cityPage.seoKeywords', { category: categoryData.value?.name, city: cityDisplayName.value })),
  // Thin pages (no venues for this category+city) stay out of the index.
  robots: computed(() => (unfilteredCount.value > 0 ? 'index, follow' : 'noindex, nofollow')),
})

defineOgImage('NuxtSeo', {
  title: computed(() => `${categoryData.value?.name} ${cityDisplayName.value}`),
  description: pageDescription,
  theme: '#1E293B',
})

const breadcrumbItems = computed(() => [
  { label: t('nav.home'), to: localePath('/') },
  { label: t('nav.categories.list'), to: localePath('/categories') },
  { label: categoryData.value?.name ?? '', to: localePath(`/categories/${categoryLocaleSlug.value}`) },
  { label: cityDisplayName.value },
])

useSchemaOrg([
  defineBreadcrumb({
    itemListElement: () => breadcrumbItems.value.map((link) => ({
      name: link.label,
      item: 'to' in link ? link.to : undefined,
    })),
  }),
  defineWebPage({
    name: () => pageTitle.value,
    description: () => pageDescription.value,
    image: () => bannerSrc.value,
    '@type': ['WebPage', 'FAQPage'],
  }),
  ...faqItems.value.map(item => defineQuestion({
    name: item.label,
    acceptedAnswer: item.content,
  })),
  defineItemList({
    numberOfItems: () => totalCount.value,
    itemListElement: () => venues.value.slice(0, 10).map((venue, i) => ({
      position: i + 1,
      item: {
        '@type': 'SportsActivityLocation',
        name: venue.name,
            url: absoluteUrl(localePath(`/venues/${venue.slug}`)),
      },
    })),
  }),
])
</script>
