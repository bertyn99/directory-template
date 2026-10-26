<script setup lang="ts">
const { t } = useI18n()

const steps = computed(() => [
  { icon: 'i-heroicons-magnifying-glass', title: t('home.evolution.step1.title'), description: t('home.evolution.step1.description'), color: 'bg-neutral-100 dark:bg-neutral-800' },
  { icon: 'i-heroicons-scale', title: t('home.evolution.step2.title'), description: t('home.evolution.step2.description'), color: 'bg-neutral-100 dark:bg-neutral-800' },
  { icon: 'i-heroicons-check-badge', title: t('home.evolution.step3.title'), description: t('home.evolution.step3.description'), color: 'bg-green-50 dark:bg-green-900/20' },
])
</script>

<template>
  <section class="py-16">
    <div class="container mx-auto px-4">
      <h2 class="text-center text-2xl md:text-3xl font-heading font-bold text-default mb-12">
        {{ t('home.evolution.title') }}
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div
          v-for="(step, index) in steps"
          :key="index"
          class="border border-default rounded-sm p-6 text-center hover:border-primary transition-colors duration-150"
        >
          <span class="inline-flex items-center justify-center w-8 h-8 rounded-sm bg-primary text-white text-sm font-bold mb-4">
            {{ index + 1 }}
          </span>

          <div
            :class="step.color"
            class="inline-flex items-center justify-center w-14 h-14 rounded-sm mb-4"
          >
            <UIcon :name="step.icon" class="w-7 h-7 text-primary" />
          </div>

          <h3 class="text-lg font-heading font-bold text-default mb-2">
            {{ step.title }}
          </h3>

          <p class="text-muted text-sm leading-relaxed">
            {{ step.description }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
