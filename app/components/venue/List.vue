<template>
    <div class="w-full lg:flex-1 space-y-6">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm text-toned">
                <span v-if="venues.length" class="text-default font-medium">{{ resultsRange.start }} –
                    {{ resultsRange.end }}</span>
                <span v-else>0</span>
                <span class="text-muted"> / {{ totalPages }} {{ $t('common.pages') }}</span>
            </p>
            <p class="text-xs uppercase tracking-[0.35em] text-muted">{{ $t('venues.updatedRealtime') }}</p>
        </div>

        <div v-if="loading || venues.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <template v-if="loading">
                <div v-for="index in 6" :key="`skeleton-${index}`" class="border border-default bg-default rounded-sm overflow-hidden flex flex-col h-[380px]">
                    <USkeleton class="h-48 w-full rounded-none" />
                    <div class="p-5 flex flex-col gap-4 flex-1">
                        <div class="space-y-2">
                            <USkeleton class="h-4 w-1/4" />
                            <USkeleton class="h-6 w-3/4" />
                        </div>
                        <USkeleton class="h-4 w-1/2" />
                        <USkeleton class="h-10 w-full mt-auto" />
                    </div>
                </div>
            </template>
            <template v-else-if="venues.length > 0">
                <VenueCard v-for="venue in venues" :key="venue.id" :venue="venue" />
            </template>
        </div>

        <UAlert
            v-else
            class="rounded-sm border border-default bg-muted" color="primary" variant="subtle"
            :title="$t('venues.noVenuesFound')" :description="$t('venues.noVenuesFoundDesc')" />

        <UPagination
            v-model="currentPage" :total="totalPages"
            :ui="{ wrapper: 'mt-4 flex justify-center', rounded: 'rounded-sm' }" />
    </div>
</template>

<script setup lang="ts">
const PAGE_SIZE = 12

const currentPage = defineModel<number>('currentPage', { default: 1 })
const props = defineProps({
    venues: {
        type: Array,
        default: () => []
    },
    totalPages: {
        type: Number,
        default: 0
    },
    loading: {
        type: Boolean,
        default: false
    }
})

const resultsRange = computed(() => {
    if (!props.venues.length) return { start: 0, end: 0 }
    const start = (Math.max(currentPage.value, 1) - 1) * PAGE_SIZE + 1
    const end = start + props.venues.length - 1
    return { start, end }
})
</script>
