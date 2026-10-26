<script setup lang="ts">
import type { Collections } from '@nuxt/content'
import { getActivityLocaleSlug } from '~~/shared/activities'
import {
  isSiloSpokeType,
  resolveCanonicalCategorySlug,
  resolveContentLocale,
  siloTypeLabelKey,
  sortSiloEntries,
  categoryGuidesCollectionName,
} from '~~/shared/silo'

const props = withDefaults(defineProps<{
  category?: string
  type?: string
  exclude?: string
  layout?: 'grid' | 'rail'
  limit?: number | string
}>(), {
  category: undefined,
  type: undefined,
  exclude: undefined,
  layout: 'grid',
  limit: undefined,
})

const route = useRoute()
const { locale, t } = useI18n()
const localePath = useLocalePath()

const activeLocale = computed(() => resolveContentLocale(locale.value))
const collection = computed(() => categoryGuidesCollectionName(activeLocale.value) as keyof Collections)

const canonicalSlug = computed(() =>
  resolveCanonicalCategorySlug(props.category, String(route.params.category ?? '')),
)

const max = computed(() => {
  if (props.limit != null && props.limit !== '') {
    const parsed = Number(props.limit)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
  }
  return props.layout === 'rail' ? 2 : undefined
})

interface SiloLinkEntry {
  title: string
  type: string
  description?: string
  style: string
}

const { data: entries } = await useAsyncData(
  () => `silo-links-${activeLocale.value}-${canonicalSlug.value}-${props.type ?? 'all'}-${props.exclude ?? 'none'}-${max.value ?? 'all'}`,
  async () => {
    if (!canonicalSlug.value) return []
    let query = queryCollection(collection.value)
      .where('style', '=', canonicalSlug.value)
      .where('type', '<>', 'hub')
    if (props.type) {
      query = query.where('type', '=', props.type)
    }
    const rows = await query.select('title', 'description', 'style', 'type').all()
    const filtered = (rows as SiloLinkEntry[]).filter((entry) => {
      if (entry.type === props.exclude) return false
      return isSiloSpokeType(entry.type)
    })
    const sorted = sortSiloEntries(filtered)
    return max.value ? sorted.slice(0, max.value) : sorted
  },
  { watch: [canonicalSlug] },
)

const localeSlug = computed(() =>
  getActivityLocaleSlug(canonicalSlug.value, locale.value) ?? canonicalSlug.value,
)

function entryPath(type: string) {
  return localePath(`/categories/${localeSlug.value}/${type}`)
}

function typeLabel(type: string) {
  if (!isSiloSpokeType(type)) return type
  return t(siloTypeLabelKey(type), type)
}
</script>

<template>
  <nav v-if="entries?.length" class="not-prose" :aria-label="t('categories.hub.guidesTitle')">
    <ul
      v-if="layout === 'rail'"
      class="flex flex-wrap gap-x-8 gap-y-3 border-y border-default py-4"
    >
      <li v-for="entry in entries" :key="entry.type">
        <NuxtLink
          :to="entryPath(entry.type)"
          class="group block transition-colors duration-150"
        >
          <span class="block font-display text-xs font-bold uppercase tracking-wide text-primary">
            {{ typeLabel(entry.type) }}
          </span>
          <span class="mt-0.5 block text-sm font-medium text-default group-hover:text-primary">
            {{ entry.title }}
          </span>
        </NuxtLink>
      </li>
    </ul>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <NuxtLink
        v-for="entry in entries"
        :key="entry.type"
        :to="entryPath(entry.type)"
        class="group flex flex-col rounded-sm border border-default bg-default p-5 transition-colors duration-150 hover:border-primary"
      >
        <UBadge
          color="primary"
          variant="soft"
          class="mb-3 w-fit rounded-sm font-display text-xs font-bold uppercase tracking-wide"
        >
          {{ typeLabel(entry.type) }}
        </UBadge>
        <p class="font-display text-lg font-black uppercase tracking-wide text-default transition-colors duration-150 group-hover:text-primary">
          {{ entry.title }}
        </p>
        <p v-if="entry.description" class="mt-2 line-clamp-2 text-sm text-muted">
          {{ entry.description }}
        </p>
      </NuxtLink>
    </div>
  </nav>
</template>
