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
                    <div class="min-w-0 space-y-2">
                        <p class="text-xs uppercase tracking-[0.35em] text-muted">{{ $t('groups.badge') }}</p>
                        <h1 class="text-3xl leading-tight text-default">{{ franchise.name }}</h1>
                        <p class="text-toned">
                            {{ $t('groups.venueCount', { count: venueCount }) }}
                        </p>
                    </div>
                </div>
                <ul v-if="socialLinks.length" class="flex flex-wrap gap-3">
                    <li v-for="link in socialLinks" :key="link.platform">
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
                class="max-w-3xl whitespace-pre-line text-base leading-relaxed text-toned"
            >
                {{ descriptionText }}
            </p>
        </section>

        <section class="space-y-4">
            <h2 class="font-display text-xl font-black uppercase tracking-wide text-default">
                {{ $t('groups.allVenuesBy', { name: franchise.name }) }}
            </h2>
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
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

const venueCount = computed(() => franchise.value?.venues.length ?? 0)

// Descriptions resolve per locale from the JSONB shape ({ locale: { intro,
// text } }, fr fallback — same as venue descriptions). The dashboard franchise
// form may also store a plain string; tolerate both.
const descriptionText = computed(() => {
    const raw = franchise.value?.description
    if (typeof raw === 'string') return raw.trim()
    const formatted = formatDescription(raw, locale.value)
    return [formatted.intro, formatted.text].filter(Boolean).join('\n\n')
})

// socialMedia may be a stored object or a JSON string (dashboard textarea);
// normalize defensively and never render empty/foreign-shaped entries.
const SOCIAL_ICONS: Record<string, string> = {
    facebook: 'i-lucide-facebook',
    instagram: 'i-lucide-instagram',
    twitter: 'i-lucide-twitter',
    x: 'i-lucide-twitter',
    website: 'i-lucide-globe',
}

const socialLinks = computed(() => {
    let raw = franchise.value?.socialMedia
    if (typeof raw === 'string') {
        try {
            raw = JSON.parse(raw)
        } catch {
            return []
        }
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
    return Object.entries(raw as Record<string, unknown>)
        .filter((entry): entry is [string, string] =>
            typeof entry[1] === 'string' && entry[1].trim().length > 0)
        .map(([platform, href]) => ({
            platform,
            href,
            icon: SOCIAL_ICONS[platform.toLowerCase()] ?? 'i-lucide-external-link',
        }))
})

const breadcrumbLinks = computed(() => [
    { label: t('nav.home'), to: localePath('/') },
    { label: t('groups.breadcrumb'), to: localePath('/venues') },
    { label: franchise.value?.name ?? '', to: localePath(`/groups/${slug.value}`) },
])

const seoTitle = computed(() =>
    t('groups.seoTitle', { name: franchise.value?.name ?? '', count: venueCount.value }))

useSeoMeta({
    title: seoTitle,
    description: () => descriptionText.value || t('groups.allVenuesBy', { name: franchise.value?.name ?? '' }),
    ogTitle: seoTitle,
    ogDescription: () => descriptionText.value || t('groups.allVenuesBy', { name: franchise.value?.name ?? '' }),
    ogImage: () => franchise.value?.image || '/img/og-default.jpg',
    twitterCard: 'summary_large_image',
})

useSchemaOrg([
    defineBreadcrumb({
        itemListElement: breadcrumbLinks,
    }),
    defineWebPage({
        '@type': 'CollectionPage',
        name: () => franchise.value?.name ?? '',
        description: () => descriptionText.value || undefined,
    }),
])

// Comparable DB-coupled hub surfaces (city hub, category hub) emit an OG image
defineOgImage('NuxtSeo', {
    title: seoTitle,
    description: () => t('groups.venueCount', { count: venueCount.value }),
    theme: '#1E293B',
})

// Group slugs are DB-generated and identical across locales — declare the
// param so hreflang alternates resolve on SSR (strictSeo). Same convention
// as venues/[slug].vue.
useSetI18nParams({
    slug: () => slug.value,
})
</script>
