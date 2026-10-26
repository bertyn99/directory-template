<template>
    <section class="py-16 bg-muted">
        <div class="container mx-auto">
            <h2 class="text-3xl font-bold text-center text-primary mb-12">{{ t('home.featuredVenues') }}</h2>
            
            <div v-if="status === 'pending'" class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <UCard v-for="i in 4" :key="i" class="rounded-sm border border-default shadow-none">
                    <template #header>
                        <USkeleton class="h-48 w-full rounded-sm" />
                    </template>
                    <USkeleton class="h-6 w-3/4 mb-2" />
                    <USkeleton class="h-4 w-full mb-4" />
                    <USkeleton class="h-6 w-1/4 rounded-sm" />
                </UCard>
            </div>
            
            <div v-else-if="featuredVenues.length > 0" class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <NuxtLink
v-for="venue in featuredVenues" :key="venue.id" :to="localePath(`/venues/${venue.slug}`)"
                    class="group block h-full">
                    <UCard class="h-full rounded-sm border border-default shadow-none hover:border-primary transition-colors" :ui="{ body: { padding: 'p-4' }, header: { padding: 'p-0' } }">
                        <template #header>
                            <div class="overflow-hidden h-48">
                                <NuxtImg :src="getVenueImage(venue)" :alt="venue.name" format="webp" quality="80" loading="lazy" width="640" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            </div>
                        </template>
                        
                        <h3 class="text-xl font-bold text-default mb-2 line-clamp-1">{{ venue.name }}</h3>
                        <p class="text-muted mb-4 line-clamp-2 text-sm">{{ getLocalizedDescription(venue) }}</p>
                        
                        <div class="flex flex-wrap gap-2 mt-auto">
                            <UBadge v-if="venue.activities && venue.activities.length > 0" color="primary" variant="solid" class="rounded-sm text-xs truncate max-w-[120px]" :title="venue.activities[0]">
                                {{ venue.activities[0] }}
                            </UBadge>
                            <UBadge v-if="venue.address?.city?.name" color="neutral" variant="subtle" class="rounded-sm text-xs">
                                {{ venue.address.city.name }}
                            </UBadge>
                        </div>
                    </UCard>
                </NuxtLink>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import type { SearchVenuesResult } from '~~/server/db/queries/venues'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const { data, status } = await useLazyFetch<{ data: SearchVenuesResult['venues'], meta: { totalCount: number } }>('/api/venues', {
    query: { limit: 4 },
})

type Venue = SearchVenuesResult['venues'][0] & { searchPicture?: string | null }

const featuredVenues = computed(() => {
    if (!data.value?.data) return []
    return data.value.data as Venue[]
})

const getLocalizedDescription = (venue: Venue) => {
    if (!venue.description) return ''
    const description = venue.description as Record<string, { text?: string; intro?: string }>
    const desc = description[locale.value] || description.fr || description.en || Object.values(description)[0]
    if (!desc) return ''
    return desc.intro || desc.text || ''
}

const getVenueImage = (venue: Venue) => {
    // Fallback image if no searchPicture is available
    return venue.searchPicture || '/img/venue-fallback.png'
}
</script>