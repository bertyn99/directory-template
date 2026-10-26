<script setup lang="ts">
import { Motion } from 'motion-v'
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const { t } = useI18n()
const localePath = useLocalePath()
const { csrf } = useCsrf()
const toast = useToast()
const { fadeSlideIn, fadeSlideInTransition, staggerChildren, staggerContainerTransition } = useDashboardAnimations()

// Fetch venues
const { data: response, status, refresh } = useFetch<{ data: Array<VenueRow> }>('/api/users/venues', { lazy: true })
const venues = computed(() => response.value?.data ?? [])
const isLoading = computed(() => status.value === 'pending' || status.value === 'idle')

// Filters
const searchQuery = ref('')
const statusFilter = ref<'all' | 'active' | 'closed'>('all')

type VenueRow = {
  id: number
  name: string
  slug: string
  statusCode: string | null
  rating: unknown
  updatedAt: string | null
  cityName: string | null
  franchiseId: number | null
}

const filteredVenues = computed(() => {
  let result = venues.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(c => c.name?.toLowerCase().includes(q))
  }
  if (statusFilter.value !== 'all') {
    result = result.filter(c => c.statusCode === statusFilter.value)
  }
  return result
})

// Rating helper — rating is jsonb, extract numeric value
function getRating(rating: unknown): number | null {
  if (rating == null) return null
  if (typeof rating === 'number') return rating
  if (typeof rating === 'object' && rating !== null) {
    const r = rating as Record<string, unknown>
    if (typeof r.value === 'number') return r.value
    if (typeof r.average === 'number') return r.average
    if (typeof r.score === 'number') return r.score
  }
  return null
}

function formatRating(rating: unknown): string {
  const val = getRating(rating)
  return val != null ? val.toFixed(1) : '—'
}

// Table columns using TanStack columnDef with h() renderers
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UIcon = resolveComponent('UIcon')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const columns = computed<TableColumn<VenueRow>[]>(() => [
  {
    accessorKey: 'name',
    header: t('dashboard.venues.table.name'),
    cell: ({ row }) => {
      const venue = row.original
      const children: Array<ReturnType<typeof h>> = [h('span', { class: 'font-medium text-default' }, venue.name)]
      if (venue.franchiseId) {
        children.push(
          h(UBadge, { color: 'neutral', variant: 'subtle', size: 'xs', class: 'ml-2' }, () => t('dashboard.venues.franchiseBadge'))
        )
      }
      return h('div', { class: 'flex items-center gap-2' }, children)
    },
  },
  {
    accessorKey: 'cityName',
    header: t('dashboard.venues.table.city'),
    cell: ({ row }) => row.original.cityName || '—',
  },
  {
    accessorKey: 'statusCode',
    header: t('dashboard.venues.table.status'),
    cell: ({ row }) => {
      const isActive = row.original.statusCode === 'active'
      return h(UBadge, {
        color: isActive ? 'success' : 'neutral',
        variant: 'subtle',
        size: 'sm',
      }, () => isActive ? t('dashboard.venues.filters.active') : t('dashboard.venues.filters.closed'))
    },
  },
  {
    accessorKey: 'rating',
    header: t('dashboard.venues.table.rating'),
    cell: ({ row }) => {
      const val = getRating(row.original.rating)
      return h('div', { class: 'flex items-center gap-1' }, [
        h(UIcon, { name: 'i-heroicons-star-solid', class: val ? 'text-primary size-4' : 'text-muted size-4' }),
        h('span', { class: 'text-sm' }, formatRating(row.original.rating)),
      ])
    },
  },
  {
    accessorKey: 'updatedAt',
    header: t('dashboard.venues.table.lastUpdated'),
    cell: ({ row }) => h('span', { class: 'text-sm text-muted' }, formatDate(row.original.updatedAt, { emptyLabel: '—' })),
  },
  {
    id: 'actions',
    header: '',
    meta: { class: { th: 'w-12' } },
    cell: ({ row }) => {
      const venue = row.original
      return h(UDropdownMenu, {
        items: [
          [{
            label: t('dashboard.venues.actions.edit'),
            icon: 'i-heroicons-pencil-square',
            click: () => navigateToVenue(venue.slug),
          }],
          [{
            label: t('dashboard.venues.actions.delete'),
            icon: 'i-heroicons-trash',
            color: 'error',
            click: () => openDeleteConfirm(venue),
          }],
        ],
        'popper': { placement: 'bottom-end' },
      }, () => [
        h(UButton, { icon: 'i-heroicons-ellipsis-vertical', color: 'neutral', variant: 'ghost', size: 'xs' }),
      ])
    },
  },
])

// Navigation
function navigateToVenue(slug: string) {
  navigateTo(localePath(`/dashboard/venues/${slug}`))
}

// Row click
function handleRowSelect(_event: Event, row: { original: VenueRow }) {
  navigateToVenue(row.original.slug)
}

// Create venue modal (keep existing pattern)
const isFormOpen = ref(false)
function closeModal() { isFormOpen.value = false }

// Delete confirmation
const venueToDelete = ref<VenueRow | null>(null)
const isDeleteModalOpen = computed({
  get: () => venueToDelete.value !== null,
  set: (val: boolean) => { if (!val) venueToDelete.value = null },
})

async function confirmDelete() {
  if (!venueToDelete.value) return
  try {
    await $fetch(`/api/users/venues/${venueToDelete.value.id}`, {
      method: 'DELETE',
      headers: { 'csrf-token': csrf },
    })
    toast.add({ title: t('dashboard.venues.deleted'), icon: 'i-heroicons-check-circle' })
    refresh()
    venueToDelete.value = null
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    toast.add({ title: t('dashboard.venues.deleteError'), description: msg, icon: 'i-heroicons-exclamation-circle', color: 'red' })
  }
}

function openDeleteConfirm(venue: VenueRow) {
  venueToDelete.value = venue
}

// Status filter options
const statusOptions = computed(() => [
  { label: t('dashboard.venues.filters.all'), value: 'all' },
  { label: t('dashboard.venues.filters.active'), value: 'active' },
  { label: t('dashboard.venues.filters.closed'), value: 'closed' },
])
</script>

<template>
  <div>
    <!-- Navbar action (existing Teleport pattern) -->
    <ClientOnly>
      <Teleport to="#dashboard-navbar-actions">
        <UButton
          size="sm"
          icon="i-heroicons-plus-circle-16-solid"
          :label="t('dashboard.venues.newVenue')"
          variant="soft"
          @click="isFormOpen = !isFormOpen"
        />
      </Teleport>
    </ClientOnly>

    <!-- Create venue modal (existing pattern) -->
    <BaseModal v-model="isFormOpen" :title="t('dashboard.venues.title')" :subtitle="t('dashboard.venues.newVenue')">
      <VenueCreateForm :close="closeModal" />
    </BaseModal>

    <!-- Page content -->
    <Motion
      tag="div"
      :initial="fadeSlideIn.hidden"
      :animate="fadeSlideIn.visible"
      :transition="fadeSlideInTransition"
      class="p-4 sm:p-6"
    >
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-semibold">
          {{ t('dashboard.venues.title') }}
        </h1>
        <p class="text-muted">
          {{ t('dashboard.venues.subtitle') }}
        </p>
      </div>

      <!-- Filter bar -->
      <Motion
        tag="div"
        :initial="fadeSlideIn.hidden"
        :animate="fadeSlideIn.visible"
        :transition="fadeSlideInTransition"
        class="flex flex-col sm:flex-row gap-3 mb-4"
      >
        <UInput
          v-model="searchQuery"
          :placeholder="t('dashboard.venues.search')"
          icon="i-heroicons-magnifying-glass"
          class="sm:w-72"
        />
        <USelectMenu
          v-model="statusFilter"
          :items="statusOptions"
          value-key="value"
          :placeholder="t('dashboard.venues.table.status')"
          class="sm:w-40"
        />
      </Motion>

      <!-- Table or empty state -->
      <Motion
        tag="div"
        :initial="staggerChildren.hidden"
        :animate="staggerChildren.visible"
        :transition="staggerContainerTransition"
        class="border border-default rounded-sm bg-default"
      >
        <!-- Loading state -->
        <div v-if="isLoading" class="p-8 text-center text-muted">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin size-6 mx-auto mb-2" />
          <p>{{ t('dashboard.venues.title') }}…</p>
        </div>

        <!-- Empty state -->
        <UEmpty
          v-else-if="venues.length === 0"
          icon="i-heroicons-building-office"
          :title="t('dashboard.venues.empty')"
          :actions="[{
            icon: 'i-heroicons-plus',
            label: t('dashboard.venues.emptyCta'),
            click: () => { isFormOpen = true },
          }]"
        />

        <!-- No results after filtering -->
        <UEmpty
          v-else-if="filteredVenues.length === 0"
          icon="i-heroicons-magnifying-glass"
          :title="t('dashboard.venues.search')"
          :description="t('dashboard.venues.empty')"
        />

        <!-- Data table -->
        <UTable
          v-else
          :data="filteredVenues"
          :columns="columns"
          :loading="isLoading"
          class="w-full"
          @select="handleRowSelect"
        />
      </Motion>
    </Motion>

    <!-- Delete confirmation modal -->
    <ClientOnly>
      <UModal v-model:open="isDeleteModalOpen">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-2">{{ t('dashboard.venues.confirmDelete') }}</h3>
          <p class="text-muted text-sm mb-6">{{ t('dashboard.venues.confirmDeleteDescription') }}</p>
          <div class="flex gap-3 justify-end">
            <UButton color="neutral" variant="soft" @click="isDeleteModalOpen = false">
              {{ t('dashboard.venue.cancel') }}
            </UButton>
            <UButton color="error" @click="confirmDelete">
              {{ t('dashboard.venues.actions.delete') }}
            </UButton>
          </div>
        </div>
      </UModal>
    </ClientOnly>
  </div>
</template>
