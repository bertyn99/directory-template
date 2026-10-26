<template>
    <div class="w-full lg:w-80 xl:w-96 flex-shrink-0">
        <UCard class="sticky top-6 space-y-6 border border-default bg-muted rounded-sm px-6 py-6">
            <div class="space-y-2">
                <p class="text-xs tracking-[0.3em] uppercase text-muted whitespace-nowrap">{{ $t('venues.filter.tuneSearch') }}</p>
                <h2 class="text-xl text-default leading-tight">{{ $t('venues.filter.name') }}</h2>
                <p class="text-sm text-toned leading-relaxed">{{ $t('venues.filter.subtitle') }}
                </p>
            </div>

            <div class="space-y-5">
                <!-- Name search -->
                <UFormField
:label="$t('venues.filter.name')" name="search"
                    :ui="{ label: 'text-xs uppercase tracking-[0.25em] text-muted mb-2' }">
                    <UInput
v-model="searchName" icon="i-lucide-search"
                        :placeholder="$t('venues.filter.searchPlaceholder')"
                        class="rounded-sm w-full"
                        @update:model-value="onNameSearch" />
                </UFormField>

                <!-- Country filter -->
                <UFormField
:label="$t('venues.filter.country.name')" name="country"
                    :ui="{ label: 'text-xs uppercase tracking-[0.25em] text-muted mb-2' }">
                    <USelectMenu
v-model="selectedCountry" :items="countries" :loading="loadingCountries"
                        :search-term="countrySearch" :ignore-filter="true" label-key="label"
                        by="code" clear :placeholder="$t('venues.filter.country.placeholder')"
                        class="rounded-sm w-full"
                        @update:search-term="onCountrySearch">
                        <template #leading>
                            <UIcon
v-if="selectedCountry?.code"
                                :name="`i-flag:${selectedCountry.code.toLowerCase()}-4x3`" class="mr-2 w-5 h-4" />
                            <UIcon v-else name="mdi:earth" />
                        </template>
                        <template #item="{ item }">
                            <span class="flex items-center">
                                <UIcon
v-if="item?.code"
                                    :name="`i-flag:${item.code.toLowerCase()}-4x3`" class="mr-2 w-5 h-4" />
                                {{ item.code ? $t(`country_names.${item.code}`, item.name) : item.name }}
                            </span>
                        </template>
                    </USelectMenu>
                </UFormField>

                <!-- City filter -->
                <UFormField
:label="$t('venues.filter.city.name')"
                    :ui="{ label: 'text-xs uppercase tracking-[0.25em] text-muted mb-2' }">
                    <USelectMenu
v-model="selectedCity" :items="cities" :loading="loadingCities"
                        :search-term="citySearch" :ignore-filter="true" label-key="name"
                        clear :placeholder="$t('venues.filter.city.name')"
                        class="rounded-sm w-full"
                        @update:search-term="onCitySearch" />
                </UFormField>

                <!-- Activities filter -->
                <UFormField
:label="$t('venues.filter.activities.name')"
                    :ui="{ label: 'text-xs uppercase tracking-[0.25em] text-muted mb-2' }">
                    <USelectMenu
v-model="selectedActivities" :items="activities" :loading="loadingActivities"
                        :search-term="activitySearch" :ignore-filter="true" multiple
                        label-key="name" clear :placeholder="$t('venues.filter.activities.name')"
                        class="rounded-sm w-full"
                        @update:search-term="onActivitySearch" />
                </UFormField>

                <!-- Apply and Reset buttons -->
                <div class="flex gap-2 pt-2">
                    <UButton
color="primary" class="flex-1 justify-center rounded-sm font-medium"
                        @click="$emit('apply-filters')">
                        {{ $t('venues.filter.apply') }}
                    </UButton>
                    <UButton
color="gray" variant="ghost"
                        class="rounded-sm border border-default text-toned font-medium"
                        @click="$emit('reset-filters')">
                        {{ $t('venues.filter.reset') }}
                    </UButton>
                </div>
            </div>
        </UCard>
    </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'

const { t, locale } = useI18n()
const selectedCountry = defineModel<{
    name: string; slug: string; code?: string
} | null>('selectedCountry')
const selectedCity = defineModel<{
    name: string; slug: string
} | null>('selectedCity')
const selectedActivities = defineModel<{ id: number; name: string; slug: string }[]>('selectedActivities')
const searchName = defineModel<string>('searchName')

const emit = defineEmits(['apply-filters', 'reset-filters'])

// Reactive item arrays for each SelectMenu
const countries = ref([])
const cities = ref([])
const activities = ref([])

// Loading states
const loadingCountries = ref(false)
const loadingCities = ref(false)
const loadingActivities = ref(false)

// Search terms
const countrySearch = ref('')
const citySearch = ref('')
const activitySearch = ref('')

// Fetch countries (debounced with VueUse)
let countriesRequestId = 0
const fetchCountries = useDebounceFn(async (q: string) => {
    const requestId = ++countriesRequestId
    loadingCountries.value = true
    try {
        const data = await $fetch('/api/countries', { query: { search: q } })
        if (requestId !== countriesRequestId) return
        countries.value = (data.countries ?? []).map((c: { code?: string; name: string; slug: string }) => ({
            ...c,
            label: c.code ? t(`country_names.${c.code}`, c.name) : c.name
        }))
    } finally {
        if (requestId === countriesRequestId) loadingCountries.value = false
    }
}, 300)

function onCountrySearch(q: string) {
    countrySearch.value = q
    fetchCountries(q)
}

// Name search (debounced with VueUse)
const onNameSearch = useDebounceFn(() => {
    emit('apply-filters')
}, 400)

// Fetch cities (debounced with VueUse)
let citiesRequestId = 0
const fetchCities = useDebounceFn(async (q: string) => {
    const requestId = ++citiesRequestId
    loadingCities.value = true
    try {
        const data = await $fetch('/api/cities', { query: { search: q || null, limit: 12 } })
        if (requestId !== citiesRequestId) return
        cities.value = Array.isArray(data) ? data : []
    } finally {
        if (requestId === citiesRequestId) loadingCities.value = false
    }
}, 300)

function onCitySearch(q: string) {
    citySearch.value = q
    fetchCities(q)
}

// Fetch activities/categories (debounced with VueUse)
let activitiesRequestId = 0
const fetchActivities = useDebounceFn(async (q: string) => {
    const requestId = ++activitiesRequestId
    loadingActivities.value = true
    try {
        const data = await $fetch('/api/categories', {
            query: { search: q || null, locale: locale.value },
        })
        if (requestId !== activitiesRequestId) return
        activities.value = data.data ?? []
    } finally {
        if (requestId === activitiesRequestId) loadingActivities.value = false
    }
}, 300)

function onActivitySearch(q: string) {
    activitySearch.value = q
    fetchActivities(q)
}

// Load initial items on mount
onMounted(async () => {
    loadingCountries.value = true
    loadingCities.value = true
    loadingActivities.value = true

    try {
        const [countriesData, citiesData, categoriesData] = await Promise.all([
            $fetch('/api/countries', { query: {} }),
            $fetch('/api/cities', { query: { limit: 12 } }),
            $fetch('/api/categories', { query: { locale: locale.value } }),
        ])

        countries.value = (countriesData.countries ?? []).map((c: { code?: string; name: string; slug: string }) => ({
            ...c,
            label: c.code ? t(`country_names.${c.code}`, c.name) : c.name
        }))
        cities.value = Array.isArray(citiesData) ? citiesData : []
        activities.value = categoriesData.data ?? []
    } finally {
        loadingCountries.value = false
        loadingCities.value = false
        loadingActivities.value = false
    }
})

// Refresh category labels when locale changes (EN base + locale map)
watch(locale, () => {
    fetchActivities(activitySearch.value)
})
</script>
