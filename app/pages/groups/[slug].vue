<template>
  <UContainer class="py-10 space-y-8">
    <UBreadcrumb :links="breadcrumbLinks" />

    <section class="rounded-sm border border-default bg-muted px-6 py-6 space-y-4">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex min-w-0 items-start gap-4">
          <img
            v-if="franchise.image"
            :src="franchise.image"
            :alt="franchise.name"
            class="size-20 shrink-0 rounded-sm border border-default object-cover"
          >
          <div class="space-y-2 min-w-0">
            <p class="text-xs uppercase tracking-[0.35em] text-muted">{{ $t('groups.badge') }}</p>
            <h1 class="text-3xl text-default leading-tight">{{ franchise.name }}</h1>
            <p class="text-toned">
              {{ $t('groups.venueCount', { count: franchise.venues.length }) }}
            </p>
          </div>
        </div>
        <ul
          v-if="socialLinks.length"
          class="flex flex-wrap gap-3"
        >
          <li
            v-for="link in socialLinks"
            :key="link.platform"
          >
            <UButton
              :href="link.href"
              target="_blank"
              rel="noopener noreferrer"
              variant="ghost"
              class="rounded-sm border border-default"
              :icon="link.icon"
            >
              {{ link.platform }}
            </UButton>
          </li>
        </ul>
      </div>
      <p
        v-if="descriptionText"
        class="max-w-3xl text-base leading-relaxed text-toned whitespace-pre-line"
      >
        {{ descriptionText }}
      </p>
    </section>

    <section class="space-y-4">
      <h2 class="font-display text-xl font-black uppercase tracking-wide text-default">
        {{ $t('groups.allVenuesBy', { name: franchise.name }) }}
      </h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <VenueCard
          v-for="venue in franchise.venues"
          :key="venue.id"
          :venue="venue"
        />
      </div>
    </section>
  </UContainer>
</template>

<script setup lang="ts">
import { formatDescription } from '~/utils/format'
import { directoryConfig } from '~~/directory.config'

const route = useRoute()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const slug = computed(() => String(route.params.slug ?? ''))

const { data: franchise, error } = await useAsyncData(
  `group-${slug.value}`,
  () => $fetch(`/api/groups/${slug.value}`),
  { transform: (res) => res.data },
)

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode || 500,
    statusMessage: error.value.statusMessage || 'Failed to load group',
  })
}

if (!franchise.value) {
  throw createError({ statusCode: 404, statusMessage: 'Group not found' })
}

const descriptionText = computed(() => {
  const formatted = formatDescription(franchise.value?.description, locale.value)
  return formatted.intro || formatted.text || ''
})

const SOCIAL_ICONS: Record<string, string> = {
  facebook: 'i-lucide-facebook',
  instagram: 'i-lucide-instagram',
  twitter: 'i-lucide-twitter',
  website: 'i-lucide-globe',
}

const socialLinks = computed(() => {
  const raw = franchise.value?.socialMedia
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
  return Object.entries(raw as Record<string, unknown>)
    .filter(([, href]) => typeof href === 'string' && href.trim())
    .map(([platform, href]) => ({
      platform,
      href: String(href),
      icon: SOCIAL_ICONS[platform.toLowerCase()] ?? 'i-lucide-external-link',
    }))
})

const breadcrumbLinks = computed(() => [
  { label: t('nav.home'), to: localePath('/') },
  { label: t('groups.breadcrumb'), to: localePath('/venues') },
  { label: franchise.value?.name ?? '', to: localePath(`/groups/${slug.value}`) },
])

const count = computed(() => franchise.value?.venues.length ?? 0)

useSeoMeta({
  title: () => t('groups.seoTitle', { name: franchise.value?.name ?? '', count: count.value }),
  description: () => t('groups.allVenuesBy', { name: franchise.value?.name ?? '' }),
})

useSchemaOrg([
  defineWebPage({
    name: franchise.value?.name,
    url: `${directoryConfig.url}${localePath(`/groups/${slug.value}`)}`,
  }),
])
</script>
