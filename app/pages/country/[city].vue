<template>
  <UContainer>
    <UBreadcrumb :links="breadcrumbLinks" class="mb-6 pt-6" />

    <!-- Hero -->
    <section class="py-10 border-b border-default">
      <h1 class="text-4xl font-black uppercase tracking-tight text-default font-heading">
        {{ t('countries.cities.venuesInCity', { city: cityName }) }}
      </h1>
      <p v-if="totalCount > 0" class="mt-2 text-lg text-muted">
        {{ t('countries.cities.venues', { nbVenues: totalCount }) }}
      </p>
    </section>

    <!-- Venue Grid -->
    <section v-if="venues.length > 0" class="py-10">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <VenueCard v-for="venue in venues" :key="venue.id" :venue="venue" />
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="mt-10 flex justify-center">
        <UPagination v-model="currentPage" :total="totalCount" :page-count="pageSize" />
      </div>
    </section>

    <!-- Empty State -->
    <section v-else class="py-16 text-center">
      <UIcon name="i-heroicons-magnifying-glass" class="w-16 h-16 text-muted mx-auto mb-4" />
      <h2 class="text-2xl font-bold mb-2 uppercase font-heading">
        {{ t('countries.cities.noVenues') }}
      </h2>
      <UButton :to="localePath('/venues')" color="primary" variant="ghost" class="mt-4 rounded-sm">
        {{ t('venues.title') }}
      </UButton>
    </section>
  </UContainer>
</template>

<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()
const localePath = useLocalePath()

const citySlug = computed(() => {
  const param = route.params.city
  return Array.isArray(param) ? param[0] : param || ''
})

const cityName = computed(() => {
  const slug = citySlug.value
  if (!slug) return ''
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
})

// Pagination state
const currentPage = ref(1)
const pageSize = 20

// Fetch venues from API
const { data: result } = await useAsyncData(
  `city-venues-${citySlug.value}-${currentPage.value}`,
  () => $fetch('/api/venues', {
    params: {
      city: citySlug.value,
      page: currentPage.value,
      limit: pageSize,
    },
  }),
  { watch: [currentPage] },
)

const venues = computed(() => (result.value as { data: unknown[] })?.data ?? [])
const totalCount = computed(() => (result.value as { meta?: { totalCount: number } })?.meta?.totalCount ?? 0)
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize))

// Breadcrumbs
const breadcrumbLinks = computed(() => [
  { label: t('nav.home'), to: localePath('/') },
  { label: t('nav.countries'), to: localePath('/country') },
  { label: cityName.value, to: localePath(`/country/${citySlug.value}`) },
])

// SEO — global titleTemplate appends "| Directory Template"
useSeoMeta({
  title: () => t('countries.cities.seoTitle', { city: cityName.value }),
  description: () => t('countries.cities.seoDescription', { city: cityName.value }),
  ogTitle: () => t('countries.cities.seoTitle', { city: cityName.value }),
  ogDescription: () => t('countries.cities.seoDescription', { city: cityName.value }),
})

defineBreadcrumb({
  itemListElement: [
    { name: 'Home', item: '/' },
    { name: 'Countries', item: '/country' },
    { name: () => cityName.value },
  ],
})

defineWebPage({
  '@type': 'CollectionPage',
  name: () => t('countries.cities.seoTitle', { city: cityName.value }),
  description: () => t('countries.cities.seoDescription', { city: cityName.value }),
})

useSetI18nParams({
  city: () => citySlug.value,
})
</script>
