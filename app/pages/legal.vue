<template>
  <UContainer class="py-10">
    <UBreadcrumb :items="links" class="mb-8" />
    <div class="mb-4 h-1 w-10 bg-primary" aria-hidden="true" />
    <h1 class="max-w-3xl text-4xl font-black uppercase tracking-tight text-default md:text-5xl">
      {{ t('pages.legal.title') }}
    </h1>
    <div class="mt-8 max-w-3xl space-y-8">
      <section
        v-for="section in sections"
        :key="section"
        :aria-labelledby="`legal-${section}`"
      >
        <h2
          :id="`legal-${section}`"
          class="font-display text-xl font-bold uppercase tracking-wide text-default"
        >
          {{ t(`pages.legal.${section}.title`) }}
        </h2>
        <p class="mt-2 whitespace-pre-line leading-relaxed text-default">
          {{ t(`pages.legal.${section}.body`) }}
        </p>
      </section>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

const sections = ['editor', 'publication', 'hosting', 'ip', 'data', 'cookies', 'disputes'] as const

const links = useBreadcrumbItems({
  overrides: [
    undefined,
    { label: t('footerNav.legal'), to: localePath('/legal') },
  ],
})

useSeoMeta({
  title: t('pages.legal.title'),
  description: t('pages.legal.description'),
})
</script>
