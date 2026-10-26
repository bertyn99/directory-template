<script setup lang="ts">
import { findActivityDefinition, getActivityDisplayName, getActivityLocaleSlug } from '~~/shared/activities'
import { resolveCanonicalCategorySlug } from '~~/shared/silo'

const props = defineProps<{
  category?: string
}>()

const route = useRoute()
const { locale, t, te } = useI18n()
const localePath = useLocalePath()

const canonicalSlug = computed(() =>
  resolveCanonicalCategorySlug(props.category, String(route.params.category ?? '')),
)

const categoryName = computed(() =>
  canonicalSlug.value
    ? getActivityDisplayName(canonicalSlug.value, locale.value)
    : '',
)

const localeSlug = computed(() =>
  getActivityLocaleSlug(canonicalSlug.value, locale.value) ?? canonicalSlug.value,
)

interface CityCard {
  name: string
  venueCount: number
}

const { data: venueMeta } = await useAsyncData(
  () => `venue-cta-${canonicalSlug.value}`,
  async () => {
    if (!canonicalSlug.value) return { totalCount: 0, cities: [] as CityCard[] }
    const [venuesResp, citiesResp] = await Promise.all([
      $fetch<{ meta: { totalCount: number } }>('/api/venues', {
        query: { activities: canonicalSlug.value, limit: 1 },
      }),
      $fetch<{ data: { eu: CityCard[], country: { cities: CityCard[] } | null } }>(
        `/api/categories/${canonicalSlug.value}/cities`,
      ),
    ])
    const merged = [...(citiesResp.data?.eu ?? []), ...(citiesResp.data?.country?.cities ?? [])]
    const seen = new Set<string>()
    const cities = merged
      .filter((city) => {
        const key = city.name.toLowerCase()
        if (seen.has(key) || city.venueCount <= 0) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => b.venueCount - a.venueCount)
      .slice(0, 3)
    return { totalCount: venuesResp.meta?.totalCount ?? 0, cities }
  },
  { watch: [canonicalSlug] },
)

const venuesPath = computed(() =>
  canonicalSlug.value
    ? localePath(`/venues?activities=${canonicalSlug.value}`)
    : localePath('/venues'),
)

function cityLabel(name: string) {
  const key = `eu_city_names.${name}`
  return te(key) ? t(key) : name
}

function cityPath(name: string) {
  return categoryCityPath(localePath, localeSlug.value, name)
}
</script>

<template>
  <aside class="not-prose my-8 overflow-hidden rounded-sm border border-default bg-muted">
    <div class="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="font-display text-xl font-black uppercase tracking-tight text-default">
          {{ t('guide.venueCta', { category: categoryName }) }}
        </p>
        <p v-if="venueMeta?.totalCount" class="mt-1 text-sm text-muted">
          {{ t('categories.hub.venueCtaCount', { count: venueMeta.totalCount, category: categoryName }) }}
        </p>
      </div>
      <UButton
        :to="venuesPath"
        color="primary"
        variant="solid"
        class="rounded-sm shrink-0 font-display font-bold uppercase tracking-wide"
        icon="i-heroicons-magnifying-glass"
        :label="t('guide.browseVenues')"
      />
    </div>
    <ul
      v-if="venueMeta?.cities?.length"
      class="flex flex-wrap gap-x-4 gap-y-2 border-t border-default px-6 py-4"
    >
      <li v-for="city in venueMeta.cities" :key="city.name">
        <NuxtLink
          :to="cityPath(city.name)"
          class="text-sm font-medium text-primary transition-colors duration-150 hover:text-primary/80"
        >
          {{ t('guide.venueCtaCity', { category: categoryName, city: cityLabel(city.name) }) }}
        </NuxtLink>
      </li>
    </ul>
  </aside>
</template>
