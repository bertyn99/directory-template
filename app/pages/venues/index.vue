<template>
    <UContainer :ui="{ constrained: 'max-w-[1600px]' }" class="py-10 space-y-8">
        <UBreadcrumb :links="links" />

        <section class="border border-default bg-muted rounded-sm px-6 py-6 space-y-8">
            <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div class="space-y-4 max-w-3xl">
                    <div class="space-y-2">
                        <p class="text-xs tracking-[0.4em] uppercase text-muted">{{ $t('venues.badge') }}</p>
                        <h1 class="text-4xl text-default leading-tight">{{ $t('venues.title') }}</h1>
                        <p class="text-toned text-base">{{ $t('venues.subTitle') }}</p>
                    </div>
                    <div class="flex flex-wrap gap-3">
                        <UButton color="primary" class="rounded-sm font-semibold tracking-wide" @click="focusFilters">
                            {{ $t('venues.adjustFilters') }}
                        </UButton>
                        <UButton
                            v-if="hasActiveFilters"
                            class="rounded-sm border border-default text-toned font-medium" @click="resetFilters">
                            {{ $t('venues.reset') }}
                        </UButton>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-[220px] lg:max-w-xl">
                    <div class="rounded-sm border border-default bg-default px-4 py-3">
                        <p class="text-xs uppercase tracking-wide text-muted">{{ $t('venues.stats.tracked') }}</p>
                        <p class="text-3xl font-semibold text-default">{{ formattedTotalCount }}</p>
                        <p class="text-xs text-toned mt-1">{{ $t('venues.stats.coverage') }}</p>
                    </div>
                    <div class="rounded-sm border border-default bg-default px-4 py-3">
                        <p class="text-xs uppercase tracking-wide text-muted">{{ $t('venues.stats.visible') }}</p>
                        <p class="text-3xl font-semibold text-default">{{ visibleCount }}</p>
                        <p class="text-xs text-toned mt-1">{{ resultsWindow }}</p>
                    </div>
                    <div class="rounded-sm border border-default bg-default px-4 py-3">
                        <p class="text-xs uppercase tracking-wide text-muted">{{ $t('venues.stats.filters') }}</p>
                        <p class="text-3xl font-semibold text-default">{{ hasActiveFilters ? hasActiveFilters : '0' }}
                        </p>
                        <p class="text-xs text-toned mt-1">{{ hasActiveFilters ? $t('venues.stats.customView') : $t('venues.stats.fullDirectory') }}</p>
                    </div>
                </div>
            </div>

            <div class="rounded-sm border border-default bg-default px-6 py-4">
                <div class="flex items-center justify-between gap-4">
                    <div class="flex items-center gap-4 flex-1 min-w-0">
                        <span class="text-xs uppercase tracking-[0.35em] text-muted whitespace-nowrap">{{ $t('venues.filters') }}</span>
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                            <template v-if="activeFilters.length">
                                <UBadge
                                    v-for="filter in activeFilters" :key="filter" color="primary" variant="soft"
                                    class="rounded-sm border border-primary/40 text-default whitespace-nowrap">
                                    {{ filter }}
                                </UBadge>
                            </template>
                            <span v-else class="text-sm text-toned">{{ $t('venues.noFiltersApplied') }}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 flex-none">
                        <USkeleton v-if="pending" class="h-5 w-24 rounded-sm" />
                        <UButton
                            v-else
                            class="rounded-sm text-xs uppercase tracking-[0.3em] border border-default hover:border-primary transition-colors"
                            @click="focusFilters">
                            {{ $t('venues.openFilters') }}
                        </UButton>
                    </div>
                </div>
            </div>
        </section>

        <div class="flex flex-col gap-8 lg:flex-row">
            <div ref="filtersAnchor" class="flex flex-col flex-none">
                <VenueFilters
                    v-model:search-name="searchName" v-model:selected-country="selectedCountry" v-model:selected-city="selectedCity"
                    v-model:selected-activities="selectedActivities" @apply-filters="applyFilters"
                    @reset-filters="resetFilters" />
            </div>

            <VenueList v-model="currentPage" :venues="venues" :total-pages="totalPages" :loading="pending" />
        </div>
    </UContainer>
</template>

<script setup>
import { useVenueFilters } from '~/composables/useVenueFilters'

const RESULTS_PER_PAGE = 12

const { t, locale } = useI18n()
const links = useBreadcrumbItems()
const localePath = useLocalePath()
useHead({
    title: t('venues.title'),
    meta: [
        { name: 'description', content: t('venues.subTitle') }
    ],
})
const router = useRouter();
const route = useRoute();
const {
    searchName,
    selectedCountry,
    selectedCity,
    selectedActivities,
    currentPage,
    routeQuery,
    applyFilters,
    resetFilters,
    updatePage
} = useVenueFilters(router, route)

const keyCacheVenue = () => {
    const filters = {
        search: searchName.value,
        country: selectedCountry.value?.code,
        city: selectedCity.value?.slug,
        activities: selectedActivities.value?.map(a => a.id).join(','),
        page: currentPage.value,
        locale: locale.value,
    };

    const key = Object.entries(filters)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
    return key ? `venues-${key}` : 'venues-default';
};
const { data, refresh, pending } = await useAsyncData(`${keyCacheVenue()}`, () =>
    $fetch("/api/venues", {
        query: {
            search: routeQuery.value?.search ?? null,
            country: routeQuery.value?.country ?? null,
            city: routeQuery.value?.city ?? null,
            activities: routeQuery.value?.activities,
            locale: locale.value,
            limit: RESULTS_PER_PAGE,
            page: currentPage.value ?? 1,
        },
    })
);

watch([routeQuery, locale], () => {
    refresh()
})


const venues = computed(() => data.value?.data ?? []);
const totalPages = computed(() => data.value?.meta?.totalPages ?? 0);
const totalCount = computed(() => data.value?.meta?.totalCount ?? 0);
const visibleCount = computed(() => venues.value?.length ?? 0);
const normalizeLabel = (value) => {
    if (!value) return null
    if (typeof value === 'string') return value
    return value.name ?? null
}

const activeFilters = computed(() => {
    const filters = []
    if (searchName.value) filters.push(`"${searchName.value}"`)
    if (selectedCountry.value) {
      const label = selectedCountry.value.code 
        ? t(`country_names.${selectedCountry.value.code}`, selectedCountry.value.name)
        : selectedCountry.value.name
      filters.push(label)
    }
    if (selectedCity.value) {
      const cityLabel = normalizeLabel(selectedCity.value)
      if (cityLabel) filters.push(cityLabel)
    }
    if (selectedActivities.value?.length) {
      filters.push(...selectedActivities.value.map((activity) => normalizeLabel(activity)).filter(Boolean))
    }
    return filters
})

const hasActiveFilters = computed(() => activeFilters.value.length)
const formattedTotalCount = computed(() => (totalCount.value ?? 0).toLocaleString())
const resultsWindow = computed(() => {
    if (!visibleCount.value) return `0 ${t('venues.stats.results')}`
    const start = ((currentPage.value ?? 1) - 1) * RESULTS_PER_PAGE + 1
    const end = start + visibleCount.value - 1
    return `${start} – ${end} ${t('venues.stats.results')}`
})

const filtersAnchor = ref(null)
const focusFilters = () => {
    if (!filtersAnchor.value) return
    filtersAnchor.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Structured data — placed after `venues`/`totalCount` are declared so ItemList can reference them.
useSchemaOrg([
    defineBreadcrumb({
        itemListElement: links
    }),
    defineWebPage({
        '@type': 'CollectionPage',
        name: () => t('venues.title'),
        description: () => t('venues.subTitle'),
    }),
    ...(venues.value.length > 0 ? [defineItemList({
        numberOfItems: totalCount.value,
        itemListElement: venues.value.map((venue, i) => ({
            position: i + 1,
            item: {
                '@type': 'SportsActivityLocation',
                name: venue.name,
                url: localePath(`/venues/${venue.slug}`),
            }
        }))
    })] : [])
])

</script>