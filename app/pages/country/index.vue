<!-- pages/countries/europe.vue -->
<template>
    <UContainer>
        <UBreadcrumb
            :links="[
                { label: $t('nav.home'), to: localePath('/') }, { label: $t('nav.countries'), to: localePath('/countries/') }]"
            class="mb-8" />

        <div class="mt-6">
            <h1 class="text-4xl font-bold mb-8 uppercase tracking-tight">{{ $t('countries.europe') }}</h1>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <NuxtLink
v-for="country in countries" :key="country.slug"
                    :aria-label="country.soon ? `${country.name} - ${$t('countries.cities.soon')}` : `${country.name} - ${$t('countries.cities.count', { count: country.cityCount })}`"
                    :to="localePath(`/venues?country=${country.code}`)" class="block group focus:outline-none">
                    <UCard
                        class="h-full flex flex-col border-default hover:border-primary ring-0 shadow-none rounded-sm bg-default transition-colors"
                        :ui="{
                            body: { base: 'flex-grow px-6 pb-6 pt-0' },
                            header: { padding: 'p-0' },
                            footer: { padding: 'px-6 py-4 border-t border-muted' },
                            rounded: 'rounded-sm'
                        }">
                        <div class="h-1 w-full bg-gradient-to-r from-primary-500 via-primary-600 to-orange-500"/>
                        <template #header>
                            <div class="flex items-start justify-between gap-3 px-6 py-5">
                                <div class="flex items-start gap-3">
                                    <UIcon
:name="country.flagIcon"
                                        class="w-8 h-6 shrink-0 rounded-sm border border-default" />
                                    <div>
                                        <p class="text-[11px] tracking-[0.2em] uppercase text-muted">
                                            {{ $t('countries.labels.continent') }}
                                        </p>
                                        <h2 class="text-xl font-bold uppercase font-display text-highlighted">
                                            {{ country.name }}
                                        </h2>
                                    </div>
                                </div>
                                <UBadge
:color="country.soon ? 'neutral' : 'primary'" variant="soft"
                                    class="uppercase text-[11px]">
                                    {{ country.soon ? $t('countries.labels.status.soon') :
                                        $t('countries.labels.status.open') }}
                                </UBadge>
                            </div>
                        </template>

                        <div class="space-y-4">
                            <template v-if="!country.soon">
                                <div class="rounded-sm border border-default bg-muted">

                                    <div class="grid grid-cols-2 divide-x divide-default">
                                        <div class="px-4 py-4 flex flex-col gap-1">
                                            <p class="text-xs text-muted uppercase tracking-[0.2em]">
                                                {{ $t('countries.labels.cities') }}
                                            </p>
                                            <p class="text-4xl font-black text-highlighted leading-tight">
                                                {{ country.cityCount }}
                                            </p>
                                            <p class="text-sm text-muted">
                                                {{ $t('countries.cities.count', { count: country.cityCount }) }}
                                            </p>
                                        </div>
                                        <div class="px-4 py-4 flex flex-col gap-1">
                                            <p class="text-xs text-muted uppercase tracking-[0.2em]">
                                                {{ $t('countries.labels.venues') }}
                                            </p>
                                            <p class="text-4xl font-black text-highlighted leading-tight">
                                                {{ country.totalVenues }}
                                            </p>
                                            <p class="text-sm text-muted">
                                                {{ $t('countries.cities.venues', { nbVenues: country.totalVenues }) }}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </template>
                            <div
v-else
                                class="rounded-sm border border-dashed border-muted bg-muted px-5 py-6 text-center flex flex-col items-center gap-3">

                                <UIcon name="i-heroicons-clock" class="w-8 h-8 text-dimmed" />
                                <p class="text-sm uppercase tracking-[0.2em] text-muted">
                                    {{ $t('countries.labels.status.soon') }}
                                </p>
                                <p class="text-xs text-muted max-w-xs">
                                    {{ $t('countries.labels.notifySoon') }}
                                </p>
                            </div>
                        </div>

                        <template #footer>
                            <button
                                class="flex items-center justify-between w-full text-sm font-semibold text-primary-600 dark:text-primary-400 transition-colors group-hover:text-primary-700 dark:group-hover:text-primary-300">
                                <span>{{ country.soon ? $t('countries.labels.ctaSoon') : $t('countries.labels.ctaOpen')
                                }}</span>
                                <UIcon name="i-heroicons-arrow-up-right" class="w-4 h-4" />
                            </button>
                        </template>
                    </UCard>
                </NuxtLink>
            </div>
        </div>
    </UContainer>
</template>

<script setup>
const { t } = useI18n()
const localePath = useLocalePath()

useHead({
    title: t('countries.title'),
    meta: [
        { name: 'description', content: t('countries.title') }
    ]
})

// Fetch countries from API
const { data: countriesData } = await useFetch('/api/countries')

const countries = computed(() => {
    const apiCountries = countriesData.value?.countries || []
    const mapped = apiCountries.map(c => ({
        name: t(`country_names.${c.code?.toUpperCase()}`, c.name),
        code: c.code,
        slug: c.slug || c.code?.toLowerCase(),
        flagIcon: `i-flag:${(c.code || 'fr').toLowerCase()}-4x3`,
        cityCount: c.cityCount || 0,
        totalVenues: c.totalVenues || 0,
        soon: false
    }))
    const comingSoon = ['es', 'it', 'pt'].map(code => ({
        name: t(`country_names.${code.toUpperCase()}`),
        code: code.toUpperCase(),
        slug: code,
        flagIcon: `i-flag:${code}-4x3`,
        cityCount: 0,
        totalVenues: 0,
        soon: true
    }))
    return [...mapped, ...comingSoon]
})
</script>
