<script setup lang="ts">
import { getActivityLocaleSlug } from '~~/shared/activities'
import { hasMajorEuCityImage, majorEuCityImageSrc } from '~~/shared/major-eu-cities'
import { resolveCanonicalCategorySlug } from '~~/shared/silo'

const props = withDefaults(defineProps<{
  category?: string
  limit?: number | string
}>(), {
  category: undefined,
limit: 5,
})

const route = useRoute()
const { locale, t, te } = useI18n()
const localePath = useLocalePath()

const canonicalSlug = computed(() =>
  resolveCanonicalCategorySlug(props.category, String(route.params.category ?? '')),
)

const max = computed(() => {
  const parsed = Number(props.limit)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5
})

interface CityCard {
  name: string
  venueCount: number
  cover?: string | null
}

const { data: cities } = await useAsyncData(
  () => `city-links-${canonicalSlug.value}-${max.value}`,
  async () => {
    if (!canonicalSlug.value) return []
    const resp = await $fetch<{ data: { eu: CityCard[], country: { cities: CityCard[] } | null } }>(
      `/api/categories/${canonicalSlug.value}/cities`,
    )
    const merged = [...(resp.data?.eu ?? []), ...(resp.data?.country?.cities ?? [])]
    const seen = new Set<string>()
    return merged
      .filter((city) => {
        const key = city.name.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return city.venueCount > 0
      })
      .sort((a, b) => b.venueCount - a.venueCount)
      .slice(0, max.value)
  },
  { watch: [canonicalSlug, max] },
)

const localeSlug = computed(() =>
  getActivityLocaleSlug(canonicalSlug.value, locale.value) ?? canonicalSlug.value,
)

function cityLabel(name: string) {
  const key = `eu_city_names.${name}`
  return te(key) ? t(key) : name
}

function cityPath(name: string) {
  return categoryCityPath(localePath, localeSlug.value, name)
}

function cityImage(city: CityCard) {
  if (city.cover) return city.cover
  if (hasMajorEuCityImage(city.name)) return majorEuCityImageSrc(city.name)
  return '/img/cities/paris.jpg'
}
</script>

<template>
  <section v-if="cities?.length" class="not-prose">
    <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      <NuxtLink
        v-for="city in cities"
        :key="city.name"
        :to="cityPath(city.name)"
        class="group relative h-36 overflow-hidden rounded-sm border border-default transition-colors duration-150 hover:border-primary"
      >
        <NuxtImg
          :src="cityImage(city)"
          :alt="cityLabel(city.name)"
          format="webp"
          width="400"
          height="240"
          sizes="200px"
          class="h-full w-full object-cover transition-transform duration-150 group-hover:scale-105"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
        <div class="absolute inset-x-0 bottom-0 p-3">
          <p class="font-display text-lg font-black uppercase text-white">{{ cityLabel(city.name) }}</p>
          <p class="text-xs text-white/80">{{ t('categories.hub.venueCount', { count: city.venueCount }) }}</p>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>
