<template>
  <UContainer class="py-10">
    <UBreadcrumb :items="links" class="mb-8" />
    <div class="mb-4 h-1 w-10 bg-primary" aria-hidden="true" />
    <h1 class="max-w-3xl text-4xl font-black uppercase tracking-tight text-default md:text-5xl">
      {{ t('pages.about.title') }}
    </h1>

    <div class="prose mt-8 max-w-3xl text-default">
      <p>{{ t('pages.about.mission.p1') }}</p>
      <p>{{ t('pages.about.mission.p2') }}</p>
    </div>

    <div v-if="statCards.length" class="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
      <div
        v-for="stat in statCards"
        :key="stat.label"
        class="rounded-sm border border-default bg-muted p-5"
      >
        <p class="font-display text-3xl font-bold text-primary">{{ stat.value }}</p>
        <p class="mt-1 text-sm uppercase tracking-wide text-muted">{{ stat.label }}</p>
      </div>
    </div>

    <section class="mt-12 max-w-3xl" aria-labelledby="about-data">
      <h2 id="about-data" class="font-display text-xl font-bold uppercase tracking-wide text-default">
        {{ t('pages.about.data.title') }}
      </h2>
      <p class="mt-2 leading-relaxed text-default">{{ t('pages.about.data.body') }}</p>
    </section>

    <div class="mt-12 grid gap-4 md:grid-cols-2">
      <div class="rounded-sm border border-default bg-muted p-6">
        <h2 class="font-display text-lg font-bold uppercase tracking-wide text-default">
          {{ t('pages.about.owners.title') }}
        </h2>
        <p class="mt-2 text-sm leading-relaxed text-muted">{{ t('pages.about.owners.body') }}</p>
        <UButton
          :to="localePath('/auth/register')"
          trailing-icon="i-heroicons-arrow-right"
          class="mt-4 rounded-sm bg-primary text-white hover:border-primary"
        >
          {{ t('pages.about.owners.cta') }}
        </UButton>
      </div>
      <div class="rounded-sm border border-default bg-muted p-6">
        <h2 class="font-display text-lg font-bold uppercase tracking-wide text-default">
          {{ t('pages.about.practitioners.title') }}
        </h2>
        <p class="mt-2 text-sm leading-relaxed text-muted">{{ t('pages.about.practitioners.body') }}</p>
        <UButton
          :to="localePath('/venues')"
          trailing-icon="i-heroicons-arrow-right"
          class="mt-4 rounded-sm bg-primary text-white hover:border-primary"
        >
          {{ t('pages.about.practitioners.cta') }}
        </UButton>
      </div>
    </div>

    <i18n-t
      keypath="pages.about.report.line"
      tag="p"
      class="mt-10 max-w-3xl text-sm text-muted"
      scope="global"
    >
      <template #link>
        <NuxtLink :to="localePath('/contact')" class="text-primary underline">
          {{ t('pages.about.report.link') }}
        </NuxtLink>
      </template>
    </i18n-t>
  </UContainer>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()

interface SiteStats {
  venues: number
  cities: number
  countries: number
  categories: number
}

const { data: result } = await useFetch<{ data: SiteStats }>('/api/stats')

const numberFormat = computed(() => new Intl.NumberFormat(locale.value))
const statCards = computed(() => {
  const stats = result.value?.data
  if (!stats) return []
  return [
    { value: numberFormat.value.format(stats.venues), label: t('pages.about.stats.venues') },
    { value: numberFormat.value.format(stats.cities), label: t('pages.about.stats.cities') },
    { value: numberFormat.value.format(stats.countries), label: t('pages.about.stats.countries') },
    { value: numberFormat.value.format(stats.categories), label: t('pages.about.stats.categories') },
  ]
})

const links = useBreadcrumbItems({
  overrides: [
    undefined,
    { label: t('nav.about'), to: localePath('/about') },
  ],
})

useSeoMeta({
  title: t('pages.about.title'),
  description: t('pages.about.description'),
})
</script>
