<template>
    <UCard
        variant="outline"
        class="group flex h-full flex-col overflow-hidden rounded-sm border border-default bg-default transition-colors duration-150 hover:border-primary"
        :ui="{
            header: venue.searchPicture ? 'p-0' : '',
            body: 'flex flex-1 flex-col gap-4 p-5',
            footer: 'mt-auto p-5 pt-0',
        }"
    >
        <template v-if="venue.searchPicture" #header>
            <div class="relative h-44 w-full overflow-hidden bg-muted">
                <img
                    :src="venue.searchPicture"
                    :alt="venue.name"
                    class="h-full w-full object-cover transition-transform duration-150 group-hover:scale-105"
                >
                <div
                    v-if="venueRating"
                    class="absolute top-3 right-3"
                >
                    <UBadge
                        color="primary"
                        variant="solid"
                        class="rounded-sm text-xs font-semibold"
                    >
                        {{ venueRating }}
                    </UBadge>
                </div>
            </div>
        </template>

        <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-start gap-2">
                <span
                    v-if="rank"
                    class="shrink-0 rounded-sm bg-primary px-1.5 py-0.5 font-display text-xs font-black leading-none text-white"
                >
                    {{ String(rank).padStart(2, '0') }}
                </span>
                <h3 class="min-h-[3.25rem] font-display text-xl font-black uppercase tracking-wide text-default line-clamp-2 transition-colors duration-150 group-hover:text-primary">
                    {{ venue.name }}
                </h3>
            </div>
            <UBadge
                v-if="venueRating && !venue.searchPicture"
                color="primary"
                variant="soft"
                class="shrink-0 rounded-sm text-xs font-semibold"
            >
                {{ venueRating }}
            </UBadge>
        </div>

        <p class="flex items-center gap-2 text-sm text-muted">
            <UIcon
                name="i-heroicons-map-pin"
                class="size-4 shrink-0 text-primary"
            />
            <span class="truncate">{{ locationLabel }}</span>
        </p>

        <div class="mt-auto flex min-h-8 items-center gap-2">
            <UTooltip
                v-for="category in activitiesPreview"
                :key="category"
                :text="category"
            >
                <UBadge
                    color="primary"
                    variant="soft"
                    class="flex size-8 items-center justify-center rounded-sm p-0"
                >
                    <UIcon
                        :name="getCategoryIcon(category)"
                        class="size-4"
                    />
                    <span class="sr-only">{{ category }}</span>
                </UBadge>
            </UTooltip>
            <UBadge
                v-if="remainingActivities > 0"
                color="neutral"
                variant="outline"
                class="rounded-sm"
            >
                {{ $t('venues.moreActivities', { count: remainingActivities }) }}
            </UBadge>
        </div>

        <template #footer>
            <UButton
                color="primary"
                block
                class="rounded-sm transition-transform duration-150 active:scale-[0.98]"
                :to="localePath(`/venues/${venue.slug}`)"
            >
                {{ $t('venues.viewVenue') }}
            </UButton>
        </template>
    </UCard>
</template>

<script setup lang="ts">
import { findActivityDefinition } from '~~/shared/activities'
import { formatParisArrondissement } from '~~/shared/major-eu-cities'

const props = defineProps({
    venue: {
        type: Object,
        required: true,
    },
    rank: {
        type: Number,
        default: null,
    },
})

const localePath = useLocalePath()
const { t } = useI18n()

const parsedActivities = computed(() => {
    const value = props.venue?.activities
    if (!value) return []
    if (Array.isArray(value)) {
        return value
            .map((item) => {
                if (typeof item === 'string') return item
                if (item && typeof item === 'object') return item.name || item.slug || ''
                return ''
            })
            .filter(Boolean)
    }
    if (typeof value === 'string') {
        return value.replace(/[{}"]/g, '')
            .split(',')
            .map(activity => activity.trim())
            .filter(Boolean)
    }
    return []
})

const activitiesPreview = computed(() => parsedActivities.value.slice(0, 3))
const remainingActivities = computed(() => Math.max(parsedActivities.value.length - activitiesPreview.value.length, 0))

// Category → icon resolution. CONFIG FIRST: when the category resolves in the
// catalog (shared/activities.ts) and carries an icon — derived from
// directoryConfig.taxonomy.categories[].icon — it wins; that is the per-niche
// surface. The keyword map below is the deliberately GENERIC fallback
// (fitness-flavoured samples) for categories without a config icon; it must
// stay niche-neutral.
const getCategoryIcon = (category: string) => {
    const def = findActivityDefinition(category)
    if (def?.icon) return def.icon
    const s = category.toLowerCase()
    if (s.includes('fitness') || s.includes('gym') || s.includes('muscu') || s.includes('train')) return 'i-lucide-dumbbell'
    if (s.includes('yoga') || s.includes('pilates') || s.includes('stretch')) return 'i-lucide-flower-2'
    if (s.includes('swim') || s.includes('piscine') || s.includes('natation') || s.includes('aquagym')) return 'i-lucide-waves'
    if (s.includes('danse') || s.includes('dance') || s.includes('zumba')) return 'i-lucide-music'
    return 'i-lucide-activity'
}

const locationLabel = computed(() => {
    const city = props.venue?.address?.city?.name as string | undefined
    const zip = props.venue?.address?.city?.zip as string | undefined
    if (city === 'Paris' && zip) {
        const arr = formatParisArrondissement(zip)
        if (arr === 1) return `${city} 1er`
        if (arr) return `${city} ${arr}e`
    }
    const country = props.venue?.address?.city?.country
    const countryLabel = typeof country === 'string'
        ? country
        : country?.code
            ? t(`country_names.${country.code}`)
            : null
    const label = [city, countryLabel].filter(Boolean).join(', ')
    return label || t('venues.location')
})

const venueRating = computed(() => {
    const rating = props.venue?.rating
    if (!rating) return null
    return formatRating(rating.google)
})
</script>
