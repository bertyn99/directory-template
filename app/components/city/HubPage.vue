<!-- City hub page body — rendered by BOTH chain routes:
     /{country}/{city} (app/pages/[country]/[city].vue, canonical in the
     'country-city-category' pattern) and /country/{country}/{city}
     (app/pages/country/[country]/[city].vue, canonical in 'category-city').
     All chain URLs come from shared/city-chain.ts so the shapes flip with
     directoryConfig.content.cityUrlPattern. -->
<template>
  <UContainer>
    <!-- 1. Breadcrumbs -->
    <UBreadcrumb :links="breadcrumbLinks" class="mb-6 pt-6" />

    <!-- 2. Hero -->
    <section class="py-10 border-b border-default">
      <h1 class="text-4xl font-black uppercase tracking-tight text-default font-heading">
        {{ t('cityHub.h1', { city: hubData?.data.city.name }) }}
      </h1>
      <UBadge v-if="hubData?.data.totalVenues > 0" color="primary" variant="solid" class="mt-4 rounded-sm">
        {{ t('cityHub.venueCount', { count: hubData.data.totalVenues }) }}
      </UBadge>
    </section>

    <!-- Empty state: replaces sections 3-6 when totalVenues === 0 -->
    <template v-if="hubData?.data.totalVenues === 0">
      <section class="py-16 text-center">
        <UIcon name="i-heroicons-map-pin" class="w-16 h-16 text-muted mx-auto mb-4" />
        <h2 class="text-2xl font-bold mb-2 uppercase font-heading">
          {{ t('cityHub.emptyTitle', { city: hubData.data.city.name }) }}
        </h2>
        <p class="text-muted mb-6">
          {{ t('cityHub.emptyDescription', { city: hubData.data.city.name }) }}
        </p>
        <UButton :to="localePath('/dashboard/venues')" color="primary" class="rounded-sm">
          {{ t('cityHub.emptyCta') }}
        </UButton>
      </section>
    </template>

    <!-- Sections 3-6: shown when totalVenues > 0 -->
    <template v-else>
      <!-- 3. City stats banner -->
      <section class="py-8 border-b border-default">
        <div class="flex flex-wrap gap-6">
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-building-storefront" class="w-5 h-5 text-primary" />
            <span class="text-sm text-muted">{{ t('cityHub.statsVenues', { count: hubData?.data.totalVenues ?? 0 }) }}</span>
          </div>
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-sparkles" class="w-5 h-5 text-primary" />
            <span class="text-sm text-muted">{{ t('cityHub.statsActivities', { count: (hubData?.data.activities ?? []).length }) }}</span>
          </div>
          <div v-if="topActivity" class="flex items-center gap-3">
            <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-primary" />
            <span class="text-sm text-muted">{{ t('cityHub.statsTopActivity', { activity: topActivity.name }) }}</span>
          </div>
        </div>
      </section>

      <!-- 4. Intro paragraph -->
      <section class="py-8">
        <p class="text-lg text-default leading-relaxed">
          {{ t('cityHub.introText', { city: hubData?.data.city.name, country: hubData?.data.country.name }) }}
        </p>
      </section>

      <!-- 5. Popular categories -->
      <section v-if="sortedActivities.length > 0" class="py-10 border-t border-default">
        <h2 class="text-2xl font-bold uppercase tracking-tight text-default font-heading mb-6">
          {{ t('cityHub.activitiesTitle', { city: hubData?.data.city.name }) }}
        </h2>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <NuxtLink
            v-for="activity in sortedActivities"
            :key="activity.id"
            :to="localePath(categoryCityPath(CITY_URL_PATTERN, activityLinkSlug(activity), countrySlug, cityNameSlug))"
            class="group flex flex-col border border-default bg-default rounded-sm overflow-hidden hover:border-primary transition-all duration-150"
          >
            <div class="relative h-32 w-full overflow-hidden bg-muted">
              <NuxtImg
                :src="`/img/activity/${activityImageSlug(activity)}.jpg`"
                :alt="activity.name"
                format="webp" quality="80" width="640" loading="lazy"
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                @error="activityImageError[activityImageSlug(activity)] = true"
              />
              <div v-if="activityImageError[activityImageSlug(activity)]" class="absolute inset-0 flex items-center justify-center bg-muted">
                <UIcon name="i-heroicons-sparkles" class="w-8 h-8 text-muted" />
              </div>
            </div>
            <div class="p-4 flex flex-col gap-2">
              <h3 class="font-semibold text-default uppercase text-sm font-heading">{{ activityDisplayName(activity) }}</h3>
              <UBadge color="primary" variant="soft" class="rounded-sm self-start">
                {{ t('cityHub.activityVenueCount', { count: activity.venueCount }) }}
              </UBadge>
            </div>
          </NuxtLink>
        </div>
      </section>

      <!-- 6. Top venues -->
      <section v-if="(hubData?.data.topVenues ?? []).length > 0" class="py-10 border-t border-default">
        <h2 class="text-2xl font-bold uppercase tracking-tight text-default font-heading mb-6">
          {{ t('cityHub.topVenuesTitle', { city: hubData?.data.city.name }) }}
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <VenueCard v-for="venue in hubData?.data.topVenues ?? []" :key="venue.id" :venue="venue" />
        </div>
      </section>
    </template>

    <!-- 7. CTA banner -->
    <section class="py-12 bg-primary">
      <div class="text-center">
        <h2 class="text-2xl font-bold uppercase tracking-tight text-white font-heading mb-3">
          {{ t('cityHub.ctaTitle') }}
        </h2>
        <p class="text-white/90 mb-6 max-w-xl mx-auto">
          {{ t('cityHub.ctaDescription', { city: hubData?.data.city.name }) }}
        </p>
        <UButton :to="localePath('/dashboard/venues')" color="neutral" variant="solid" class="rounded-sm">
          {{ t('cityHub.ctaButton') }}
        </UButton>
      </div>
    </section>

    <!-- 8. Nearby cities — same-country rows (the hub API scopes by the hub's
         country), so the chain URL reuses this page's own countrySlug. -->
    <section v-if="(hubData?.data.nearbyCities ?? []).length > 0" class="py-10 border-t border-default">
      <h2 class="text-2xl font-bold uppercase tracking-tight text-default font-heading mb-6">
        {{ t('cityHub.nearbyCitiesTitle') }}
      </h2>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <NuxtLink
          v-for="nearbyCity in hubData?.data.nearbyCities ?? []"
          :key="nearbyCity.slug"
          :to="localePath(cityHubPath(countrySlug, nearbyCity.slug))"
          class="group flex items-center justify-between border border-default bg-default rounded-sm p-4 hover:border-primary transition-all duration-150"
        >
          <span class="font-medium text-default">{{ nearbyCity.name }}</span>
          <UBadge color="primary" variant="soft" class="rounded-sm">
            {{ t('cityHub.nearbyCityVenues', { count: nearbyCity.venueCount }) }}
          </UBadge>
        </NuxtLink>
      </div>
    </section>
  </UContainer>
</template>

<script setup lang="ts">
import {
  findActivityDefinition,
  getActivityDisplayNameForRow,
  getActivityLocaleSlug,
} from '~~/shared/activities'
import {
  CITY_URL_PATTERN,
  categoryCityPath,
  cityHubPath,
} from '~~/shared/city-chain'

interface City {
  name: string
  slug: string
}

interface Country {
  name: string
  code: string
  slug: string
}

interface Activity {
  id: number
  name: string
  slug: string
  venueCount: number
}

interface Venue {
  id: number
  name: string
  slug: string
  rating: { google: number; count: number } | null
  searchPicture: string | null
  activities: Array<{ name: string; slug: string }>
}

interface NearbyCity {
  name: string
  slug: string
  venueCount: number
}

interface HubData {
  data: {
    city: City
    country: Country
    totalVenues: number
    activities: Activity[]
    topVenues: Venue[]
    nearbyCities: NearbyCity[]
  }
}

const route = useRoute()
const { t, locale } = useI18n()
const localePath = useLocalePath()

function activityLinkSlug(activity: Activity) {
  const def = findActivityDefinition(activity.slug)
  if (def) {
    return getActivityLocaleSlug(def.slug, locale.value) ?? def.slug
  }
  return activity.slug
}

/**
 * Image basename for public/img/activity/. Per-niche: when the on-disk file
 * name differs from the EN-canonical catalog slug, map it here. Activities
 * without a file fall back to the @error placeholder in the template.
 */
const ACTIVITY_IMAGE_ALIASES: Record<string, string> = {
  // e.g. 'sample-slug': 'on-disk-file-name',
}

function activityImageSlug(activity: Activity) {
  const canonical = findActivityDefinition(activity.slug)?.slug ?? activity.slug
  return ACTIVITY_IMAGE_ALIASES[canonical] ?? canonical
}

function activityDisplayName(activity: Activity) {
  return getActivityDisplayNameForRow(activity, locale.value)
}

const countrySlug = computed(() => {
  const param = route.params.country
  return Array.isArray(param) ? param[0] : param || ''
})

const cityNameSlug = computed(() => {
  const param = route.params.city
  return Array.isArray(param) ? param[0] : param || ''
})

const requestFetch = useRequestFetch()

const { data: hubData, error } = await useAsyncData(
  () => `city-hub-${countrySlug.value}-${cityNameSlug.value}`,
  () => requestFetch<HubData>(`/api/cities/hub/${countrySlug.value}/${cityNameSlug.value}`),
)

if (error.value) {
  const statusCode = error.value.statusCode || 500
  throw createError({
    statusCode,
    statusMessage: statusCode === 429 ? 'Too Many Requests' : (error.value.statusMessage || 'Server Error'),
    fatal: true,
  })
}
if (!hubData.value) {
  throw createError({ statusCode: 404, statusMessage: 'City not found', fatal: true })
}

const sortedActivities = computed(() => {
  const acts = hubData.value?.data.activities ?? []
  return [...acts].sort((a, b) => b.venueCount - a.venueCount)
})

const topActivity = computed(() => sortedActivities.value[0] ?? null)

const activityImageError = ref<Record<string, boolean>>({})

// Breadcrumbs — no country page exists, so the chain is Home / Countries
// (index) / <city> (current, unlinked).
const breadcrumbLinks = computed(() => [
  { label: t('cityHub.breadcrumbHome'), to: localePath('/') },
  { label: t('cityHub.breadcrumbCountries'), to: localePath('/country') },
  { label: hubData.value?.data.city.name },
])

// SEO
useSeoMeta({
  title: () => t('cityHub.title', { city: hubData.value?.data.city.name }),
  description: () => t('cityHub.description', {
    city: hubData.value?.data.city.name,
    country: hubData.value?.data.country.name,
    count: hubData.value?.data.totalVenues,
  }),
  ogTitle: () => t('cityHub.title', { city: hubData.value?.data.city.name }),
  ogDescription: () => t('cityHub.description', {
    city: hubData.value?.data.city.name,
    country: hubData.value?.data.country.name,
    count: hubData.value?.data.totalVenues,
  }),
  keywords: () => t('cityHub.seoKeywords', { city: hubData.value?.data.city.name }),
})

defineOgImage('NuxtSeo')

useSchemaOrg([
  defineBreadcrumb({
    itemListElement: [
      { name: () => t('cityHub.breadcrumbHome'), item: '/' },
      { name: () => t('cityHub.breadcrumbCountries'), item: '/country' },
      { name: () => hubData.value?.data.city.name ?? '' },
    ],
  }),
  defineWebPage({
    '@type': 'CollectionPage',
    name: () => t('cityHub.title', { city: hubData.value?.data.city.name ?? '' }),
    description: () => t('cityHub.description', {
      city: hubData.value?.data.city.name ?? '',
      country: hubData.value?.data.country.name ?? '',
      count: hubData.value?.data.totalVenues ?? 0,
    }),
  }),
])

const setI18nParams = useSetI18nParams()
// Register per-locale i18n params so hreflang links render on SSR (strictSeo).
// Must be a per-locale map: { fr: {...}, en: {...}, ... } — flat objects break hreflang.
// Param names country/city match BOTH chain routes; slugs are identical
// across locales.
const cityParams = () => Object.fromEntries(
  ['fr', 'en', 'de', 'es', 'it', 'pt'].map(loc => [loc, {
    country: countrySlug.value,
    city: cityNameSlug.value,
  }]),
)
setI18nParams(cityParams())
watch([countrySlug, cityNameSlug], () => {
  setI18nParams(cityParams())
})
</script>
