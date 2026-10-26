<template>
    <section class="bg-primary-600 py-24 sm:py-32 rounded-sm overflow-hidden">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
            <div class="mx-auto max-w-2xl lg:max-w-none">
                <div class="text-center">
                    <h2 class="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                        {{ $t('home.stats.title') }}
                    </h2>
                    <p class="mt-4 text-lg leading-8 text-white">
                        {{ $t('home.stats.subtitle') }}
                    </p>
                </div>
                <dl
                    class="mt-16 grid grid-cols-1 gap-0.5 overflow-hidden rounded-sm text-center sm:grid-cols-2 lg:grid-cols-4">
                    <div
v-for="stat in stats" :key="stat.id"
                        class="flex flex-col bg-white/5 p-8 rounded-sm hover:bg-white/10 focus:ring-2 focus:ring-white"
                        tabindex="0" :aria-label="`${stat.value} - ${stat.name}`">
                        <dt class="text-sm font-semibold leading-6 text-white">{{ stat.name }}</dt>
                        <dd class="order-first text-3xl font-semibold tracking-tight text-white">{{ stat.value }}</dd>
                    </div>
                </dl>
            </div>
        </div>
    </section>
</template>


<script setup lang="ts">
const { t, locale } = useI18n()

interface SiteStats {
    venues: number
    cities: number
    countries: number
    categories: number
}

const { data: result } = await useFetch<{ data: SiteStats }>('/api/stats')

const numberFormat = computed(() => new Intl.NumberFormat(locale.value))
const stats = computed(() => {
    const s = result.value?.data
    if (!s) return []
    return [
        { id: 1, name: t('home.stats.venues'), value: numberFormat.value.format(s.venues) },
        { id: 2, name: t('home.stats.cities'), value: numberFormat.value.format(s.cities) },
        { id: 3, name: t('home.stats.countries'), value: numberFormat.value.format(s.countries) },
        { id: 4, name: t('home.stats.categories'), value: numberFormat.value.format(s.categories) },
    ]
})
</script>