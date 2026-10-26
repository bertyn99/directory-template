<script setup lang="ts">
import { Motion } from 'motion-v'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const { t } = useI18n()
const localePath = useLocalePath()
const { fadeSlideIn, fadeSlideInTransition, staggerChildren, staggerContainerTransition, numberTicker } = useDashboardAnimations()

interface Stats {
  totalVenues: number
  avgRating: number
  totalReviews: number
  upcomingEvents: number
  recentReviews: { author: string, venueName: string, rating: number, comment: string, date: string }[]
  reviewsOverTime: { month: string, reviews: number }[]
}

const { data: statsResponse, status } = useFetch<{ data: Stats }>('/api/users/stats', {
  lazy: true,
  key: 'dashboard-stats',
})
const stats = computed(() => statsResponse.value?.data)

const statCards = computed(() => [
  { icon: 'i-heroicons-building-office-2', label: t('dashboard.overview.totalVenues'), value: stats.value?.totalVenues ?? 0 },
  { icon: 'i-heroicons-star', label: t('dashboard.overview.avgRating'), value: stats.value?.avgRating ?? 0, decimals: 1 },
  { icon: 'i-heroicons-chat-bubble-left-right', label: t('dashboard.overview.totalReviews'), value: stats.value?.totalReviews ?? 0 },
  { icon: 'i-heroicons-calendar-days', label: t('dashboard.overview.upcomingEvents'), value: stats.value?.upcomingEvents ?? 0 },
])

const reviewColumns = [
  { key: 'author', label: t('dashboard.review.reviewer') },
  { key: 'venueName', label: t('dashboard.venues.table.name') },
  { key: 'rating', label: t('dashboard.review.rating') },
  { key: 'comment', label: t('dashboard.review.comment') },
  { key: 'date', label: t('dashboard.review.date') },
]

const isLoading = computed(() => status.value === 'pending')
const hasNoVenues = computed(() => !isLoading.value && stats.value && stats.value.totalVenues === 0)
</script>

<template>
  <div class="p-4 space-y-6">
    <!-- Page title -->
    <Motion
      tag="h1"
      :variants="fadeSlideIn"
      :animate="'visible'"
      :initial="'hidden'"
      :transition="fadeSlideInTransition"
      class="text-2xl font-semibold"
    >
      {{ t('dashboard.overview.title') }}
    </Motion>

    <!-- Loading state -->
    <template v-if="isLoading">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <UCard v-for="i in 4" :key="i" class="rounded-sm border border-default p-6">
          <USkeleton class="h-4 w-24 mb-3" />
          <USkeleton class="h-8 w-16" />
        </UCard>
      </div>
      <UCard class="rounded-sm border border-default p-6">
        <USkeleton class="h-64 w-full" />
      </UCard>
    </template>

    <!-- Empty state -->
    <UEmpty
      v-else-if="hasNoVenues"
      :description="t('dashboard.overview.emptyDescription')"
      icon="i-heroicons-building-office-2"
    >
      <template #actions>
        <UButton
          :label="t('dashboard.overview.addVenue')"
          color="primary"
          variant="solid"
          class="rounded-sm"
          :to="localePath('/dashboard/venues')"
        />
      </template>
    </UEmpty>

    <!-- Dashboard content -->
    <template v-else-if="stats">
      <!-- Stat cards grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Motion
          v-for="(card, i) in statCards"
          :key="card.label"
          tag="div"
          :variants="staggerChildren"
          :custom="i"
          :animate="'visible'"
          :initial="'hidden'"
          :transition="staggerContainerTransition"
        >
          <UCard class="rounded-sm border border-default hover:border-primary transition-colors duration-150">
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center w-10 h-10 bg-muted rounded-sm">
                <UIcon :name="card.icon" class="text-xl text-primary" />
              </div>
              <div>
                <p class="text-sm text-muted">{{ card.label }}</p>
                <Motion
                  tag="span"
                  class="text-2xl font-semibold text-default"
                  :animate="{ opacity: 1 }"
                  :initial="{ opacity: 0 }"
                  :transition="numberTicker"
                >
                  {{ card.decimals ? card.value.toFixed(card.decimals) : card.value }}
                </Motion>
              </div>
            </div>
          </UCard>
        </Motion>
      </div>

      <!-- Reviews chart -->
      <Motion
        tag="div"
        :variants="fadeSlideIn"
        :animate="'visible'"
        :initial="'hidden'"
        :transition="fadeSlideInTransition"
      >
        <UCard class="rounded-sm border border-default">
          <template #header>
            <h2 class="text-lg font-semibold px-4 pt-4">
              {{ t('dashboard.overview.recentReviews') }}
            </h2>
          </template>
          <div class="px-4 pb-4">
            <DashboardChart
              v-if="stats.reviewsOverTime?.length"
              :data="stats.reviewsOverTime"
              :height="300"
            />
            <p v-else class="text-muted text-sm py-8 text-center">
              {{ t('dashboard.review.empty') }}
            </p>
          </div>
        </UCard>
      </Motion>

      <!-- Recent reviews table -->
      <Motion
        tag="div"
        :variants="fadeSlideIn"
        :animate="'visible'"
        :initial="'hidden'"
        :transition="fadeSlideInTransition"
      >
        <UCard class="rounded-sm border border-default">
          <template #header>
            <h2 class="text-lg font-semibold px-4 pt-4">
              {{ t('dashboard.overview.recentReviews') }}
            </h2>
          </template>
          <div class="px-4 pb-4">
            <UTable
              v-if="stats.recentReviews?.length"
              :data="stats.recentReviews"
              :columns="reviewColumns"
              class="rounded-sm"
            >
              <template #rating-data="{ row }">
                <div class="flex items-center gap-1">
                  <UIcon name="i-heroicons-star-solid" class="text-primary text-sm" />
                  <span>{{ row.rating.toFixed(1) }}</span>
                </div>
              </template>
            </UTable>
            <p v-else class="text-muted text-sm py-8 text-center">
              {{ t('dashboard.review.empty') }}
            </p>
          </div>
        </UCard>
      </Motion>

      <!-- Quick actions -->
      <Motion
        tag="div"
        :variants="fadeSlideIn"
        :animate="'visible'"
        :initial="'hidden'"
        :transition="fadeSlideInTransition"
        class="flex gap-3"
      >
        <UButton
          :label="t('dashboard.overview.addVenue')"
          icon="i-heroicons-plus"
          color="primary"
          variant="solid"
          class="rounded-sm"
          :to="localePath('/dashboard/venues')"
        />
        <UButton
          :label="t('dashboard.overview.manageFranchise')"
          icon="i-heroicons-building-storefront"
          color="secondary"
          variant="outline"
          class="rounded-sm"
          :to="localePath('/dashboard/franchise')"
        />
      </Motion>
    </template>
  </div>
</template>