<script setup lang="ts">
import type { ChartCategory } from '@nuxt/ui'

interface ReviewDataPoint {
  month: string
  reviews: number
}

withDefaults(defineProps<{
  data?: ReviewDataPoint[]
  height?: number
}>(), {
  data: () => [],
  height: 300,
})

const { t, locale } = useI18n()

const categories = computed<ChartCategory<ReviewDataPoint>[]>(() => [{
  key: 'reviews',
  label: t('dashboard.chart.reviews'),
  color: 'primary',
}])

function formatValue(value: number) {
  return new Intl.NumberFormat(locale.value).format(value)
}
</script>

<template>
  <UChart
    :data="data"
    index="month"
    :categories="categories"
    :x-label="t('dashboard.chart.months')"
    :y-label="t('dashboard.chart.reviews')"
    :height="height"
    :format="formatValue"
    :aria-label="t('dashboard.chart.reviews')"
    curve="monotone"
    points
    :legend="false"
    class="w-full"
  />
</template>
