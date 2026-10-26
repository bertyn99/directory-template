<script setup lang="ts">
import type { Franchise } from '~~/server/types'
import { Motion } from 'motion-v'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
  title: 'Franchises',
})

const { t } = useI18n()
const localePath = useLocalePath()
const { fadeSlideIn, fadeSlideInTransition, staggerChildren, staggerContainerTransition } = useDashboardAnimations()

interface FranchiseStats {
  totalVenues: number
  activeVenues: number
  avgRating: number
  totalReviews: number
  upcomingEvents: number
  reviewsOverTime: { month: string; count: number }[]
}

interface FranchiseVenue {
  id: number
  name: string
  slug: string | null
  statusCode: string | null
  rating: unknown
  website: string | null
  tel: string | null
  createdAt: string | null
}

const { data: franchises, status: franchisesStatus } = useFetch<Franchise[]>('/api/franchises', {
  lazy: true,
  key: 'user-franchises',
})

const selectedFranchiseId = ref<number | null>(null)

const activeFranchise = computed(() => {
  if (!franchises.value?.length) return null
  if (selectedFranchiseId.value) {
    return franchises.value.find(f => f.id === selectedFranchiseId.value) ?? franchises.value[0]
  }
  return franchises.value[0]
})

watch(activeFranchise, (val) => {
  if (val) selectedFranchiseId.value = val.id
}, { immediate: true })

const franchiseId = computed(() => activeFranchise.value?.id ?? 0)

const { data: statsData, status: statsStatus } = useFetch<{ data: FranchiseStats }>(`/api/franchises/${franchiseId.value}/stats`, {
  lazy: true,
  watch: [franchiseId],
})

const { data: venuesData, status: venuesStatus } = useFetch<{ data: FranchiseVenue[] }>(`/api/franchises/${franchiseId.value}/venues`, {
  lazy: true,
  watch: [franchiseId],
})

const stats = computed(() => statsData.value?.data)
const franchiseVenues = computed(() => venuesData.value?.data ?? [])

const chartData = computed(() =>
  stats.value?.reviewsOverTime?.map(r => ({ month: r.month, reviews: r.count })) ?? [],
)

const isLoading = computed(() => franchisesStatus.value === 'pending')
const isStatsLoading = computed(() => statsStatus.value === 'pending')
const hasFranchises = computed(() => !isLoading.value && franchises.value && franchises.value.length > 0)

const statCards = computed(() => [
  { icon: 'i-heroicons-building-office-2', label: t('dashboard.franchise.venuesCount'), value: stats.value?.totalVenues ?? 0 },
  { icon: 'i-heroicons-star', label: t('dashboard.franchise.avgRating'), value: stats.value?.avgRating ?? 0, decimals: 1 },
  { icon: 'i-heroicons-chat-bubble-left-right', label: t('dashboard.franchise.totalReviews'), value: stats.value?.totalReviews ?? 0 },
  { icon: 'i-heroicons-calendar-days', label: t('dashboard.franchise.totalEvents'), value: stats.value?.upcomingEvents ?? 0 },
])

const venueColumns = computed(() => [
  { key: 'name', label: t('dashboard.franchise.venues') },
  { key: 'statusCode', label: t('dashboard.franchise.status') },
  { key: 'tel', label: t('dashboard.franchise.phone') },
])

function onFranchiseChange(id: number) {
  selectedFranchiseId.value = id
}
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
      {{ t('dashboard.franchise.overview') }}
    </Motion>

    <!-- Loading state -->
    <template v-if="isLoading">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <UCard v-for="i in 4" :key="i" class="rounded-sm border border-default p-6">
          <USkeleton class="h-4 w-24 mb-3" />
          <USkeleton class="h-8 w-16" />
        </UCard>
      </div>
    </template>

    <!-- Empty state -->
    <UEmpty
      v-else-if="!hasFranchises"
      :description="t('dashboard.franchise.empty')"
      icon="i-heroicons-building-storefront"
    >
      <template #actions>
        <UButton
          :label="t('dashboard.franchise.addVenue')"
          icon="i-heroicons-plus"
          color="primary"
          variant="solid"
          class="rounded-sm"
          :to="localePath('/dashboard/venues')"
        />
      </template>
    </UEmpty>

    <!-- Franchise overview content -->
    <template v-else>
      <!-- Franchise selector -->
      <div v-if="franchises && franchises.length > 1" class="flex items-center gap-3">
        <span class="text-sm text-muted">{{ t('dashboard.franchise.selectFranchise') }}</span>
        <USelectMenu
          :model-value="selectedFranchiseId"
          :items="franchises"
          value-key="id"
          label-key="name"
          size="sm"
          class="rounded-sm"
          @update:model-value="onFranchiseChange"
        />
      </div>

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
                <span class="text-2xl font-semibold text-default">
                  {{ card.decimals ? card.value.toFixed(card.decimals) : card.value }}
                </span>
              </div>
            </div>
          </UCard>
        </Motion>
      </div>

      <!-- Reviews over time chart -->
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
              {{ t('dashboard.franchise.reviewsOverTime') }}
            </h2>
          </template>
          <div class="px-4 pb-4">
            <USkeleton v-if="isStatsLoading" class="h-64 w-full" />
            <DashboardChart
              v-else-if="chartData.length"
              :data="chartData"
              :height="300"
            />
            <p v-else class="text-muted text-sm py-8 text-center">
              {{ t('dashboard.review.empty') }}
            </p>
          </div>
        </UCard>
      </Motion>

      <!-- Franchise venues table -->
      <Motion
        tag="div"
        :variants="fadeSlideIn"
        :animate="'visible'"
        :initial="'hidden'"
        :transition="fadeSlideInTransition"
      >
        <UCard class="rounded-sm border border-default">
          <template #header>
            <div class="flex items-center justify-between px-4 pt-4">
              <h2 class="text-lg font-semibold">
                {{ t('dashboard.franchise.venues') }}
              </h2>
              <UButton
                :label="t('dashboard.franchise.assignVenue')"
                icon="i-heroicons-plus"
                size="sm"
                color="primary"
                variant="solid"
                class="rounded-sm"
                :to="localePath('/dashboard/franchise/venues')"
              />
            </div>
          </template>
          <div class="px-4 pb-4">
            <USkeleton v-if="venuesStatus === 'pending'" class="h-32 w-full" />
            <UTable
              v-else-if="franchiseVenues.length"
              :data="franchiseVenues"
              :columns="venueColumns"
              class="rounded-sm"
            >
              <template #name-data="{ row }">
                <NuxtLink
                  :to="localePath(`/dashboard/venues/${row.slug ?? row.id}`)"
                  class="text-primary hover:underline"
                >
                  {{ row.name }}
                </NuxtLink>
              </template>
              <template #statusCode-data="{ row }">
                <UBadge
                  :color="row.statusCode === 'active' ? 'success' : 'neutral'"
                  variant="subtle"
                  size="sm"
                  class="rounded-sm"
                >
                  {{ row.statusCode ?? '—' }}
                </UBadge>
              </template>
              <template #tel-data="{ row }">
                <span class="text-muted">{{ row.tel ?? '—' }}</span>
              </template>
            </UTable>
            <p v-else class="text-muted text-sm py-8 text-center">
              {{ t('dashboard.empty.noVenues') }}
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
          :label="t('dashboard.franchise.assignVenue')"
          icon="i-heroicons-plus"
          color="primary"
          variant="solid"
          class="rounded-sm"
          :to="localePath('/dashboard/franchise/venues')"
        />
        <UButton
          :label="t('dashboard.franchise.editInfo')"
          icon="i-heroicons-pencil-square"
          color="secondary"
          variant="outline"
          class="rounded-sm"
          :to="localePath('/dashboard/franchise/settings')"
        />
      </Motion>
    </template>
  </div>
</template>
