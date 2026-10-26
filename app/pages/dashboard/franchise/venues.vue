<script setup lang="ts">
import type { Franchise } from '~~/server/types'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const { csrf } = useCsrf()

const cm = (key: string) => t(`dashboard.franchise.venuesManagement.${key}`)

const franchiseId = computed(() => {
  const id = route.query.id
  return id ? parseInt(id as string) : null
})

// Redirect if no franchise ID
if (!franchiseId.value) {
  // Page exists at app/pages/dashboard/franchise.vue; the checker's route
  // table doesn't include it (auth-gated page).
  // eslint-disable-next-line link-checker/valid-route
  navigateTo('/dashboard/franchise')
}

// Fetch franchise details
const { data: franchises } = useAsyncData('myFranchises', () =>
  useRequestFetch()('/api/franchises'),
)
const currentFranchise = computed(() =>
  franchises.value?.find((f: Franchise) => f.id === franchiseId.value),
)

// Fetch franchise venues
const {
  data: franchiseVenuesData,
  pending: loadingFranchiseVenues,
  refresh: refreshFranchiseVenues,
} = useAsyncData(
  'franchiseVenues',
  () => {
    if (!franchiseId.value) return null
    return useRequestFetch()(`/api/franchises/${franchiseId.value}/venues`)
  },
  { watch: [franchiseId] },
)

const franchiseVenues = computed(() => franchiseVenuesData.value?.data ?? [])

// Fetch user's venues for assignment
const { data: userVenuesData, refresh: refreshUserVenues } = useAsyncData(
  'userVenuesForFranchise',
  () => useRequestFetch()('/api/users/venues'),
)

// Venues the user owns but aren't in this franchise yet
const availableVenues = computed(() => {
  const allVenues = userVenuesData.value?.data ?? []
  const franchiseVenueIds = new Set(
    franchiseVenues.value.map((c: { id: number }) => c.id),
  )
  return allVenues.filter((c: { id: number }) => !franchiseVenueIds.has(c.id))
})

// Selected venue for assignment
const selectedVenueId = ref<number | null>(null)

// Assign venue to franchise
const assigning = ref(false)

async function assignVenue() {
  if (!franchiseId.value || !selectedVenueId.value) return

  assigning.value = true
  try {
    await useRequestFetch()(`/api/franchises/${franchiseId.value}/venues`, {
      method: 'POST',
      body: { venueId: selectedVenueId.value },
      headers: { 'csrf-token': csrf },
    })
    toast.add({
      title: cm('assigned'),
      icon: 'i-heroicons-check-circle',
    })
    selectedVenueId.value = null
    refreshFranchiseVenues()
    refreshUserVenues()
  }
  catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : cm('assignError')
    toast.add({
      title: cm('assignError'),
      description: message,
      icon: 'i-heroicons-exclamation-circle',
      color: 'red',
    })
  }
  finally {
    assigning.value = false
  }
}

// Unassign venue from franchise with confirmation
const unassigningVenueId = ref<number | null>(null)
const isUnassignModalOpen = ref(false)

function confirmUnassign(venueId: number) {
  unassigningVenueId.value = venueId
  isUnassignModalOpen.value = true
}

async function unassignVenue() {
  if (!franchiseId.value || !unassigningVenueId.value) return

  try {
    await useRequestFetch()(
      `/api/franchises/${franchiseId.value}/venues/${unassigningVenueId.value}`,
      {
        method: 'DELETE',
        headers: { 'csrf-token': csrf },
      },
    )
    toast.add({
      title: cm('unassigned'),
      icon: 'i-heroicons-check-circle',
    })
    unassigningVenueId.value = null
    isUnassignModalOpen.value = false
    refreshFranchiseVenues()
    refreshUserVenues()
  }
  catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : cm('unassignError')
    toast.add({
      title: cm('unassignError'),
      description: message,
      icon: 'i-heroicons-exclamation-circle',
      color: 'red',
    })
  }
}

function cancelUnassign() {
  unassigningVenueId.value = null
  isUnassignModalOpen.value = false
}

// Table columns
const columns = computed(() => [
  { key: 'name', label: cm('table.name') },
  { key: 'website', label: cm('table.website') },
  { key: 'tel', label: cm('table.phone') },
  { key: 'actions', label: '' },
])
/** Prepends https:// to URLs missing a protocol so browsers don't treat them as relative paths. */
function ensureUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//.test(url)) return url;
  return `https://${url}`;
}

</script>

<template>
  <UContainer>
    <div class="p-4">
      <div class="flex items-center gap-3 mb-1">
        <UButton
          icon="i-heroicons-arrow-left"
          variant="ghost"
          size="sm"
          @click="router.push('/dashboard/franchise')"
        />
        <h1 class="text-2xl font-semibold font-display">
          {{ cm('title') }}
        </h1>
      </div>
      <p class="text-muted ml-10">
        {{ currentFranchise?.name }}
      </p>
    </div>

    <!-- Current franchise venues -->
    <div class="px-4 pb-6">
      <h2 class="text-lg font-semibold font-display mb-3">
        {{ cm('current') }}
      </h2>

      <div v-if="loadingFranchiseVenues" class="py-8 text-center">
        <UProgress animation="carousel" class="max-w-xs mx-auto" />
      </div>

      <div
        v-else-if="franchiseVenues.length === 0"
        class="border border-default rounded-sm p-6 text-center text-muted"
      >
        {{ cm('noVenues') }}
      </div>

      <UTable
        v-else
        :rows="franchiseVenues"
        :columns="columns"
        class="border border-default rounded-sm"
      >
        <template #name-cell="{ row }">
          <span class="font-medium text-default">{{ row.name }}</span>
        </template>
        <template #website-cell="{ row }">
          <a
            v-if="row.website"
            :href="ensureUrl(row.website)"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary hover:underline text-sm"
          >
            {{ row.website }}
          </a>
          <span v-else class="text-muted">—</span>
        </template>
        <template #tel-cell="{ row }">
          <span class="text-sm">{{ row.tel || '—' }}</span>
        </template>
        <template #actions-cell="{ row }">
          <UButton
            size="xs"
            variant="ghost"
            color="red"
            icon="i-heroicons-x-mark"
            :label="cm('unassign')"
            @click="confirmUnassign(row.id)"
          />
        </template>
      </UTable>
    </div>

    <!-- Unassign confirmation modal -->
    <UModal v-model:open="isUnassignModalOpen">
      <div class="p-6">
        <h3 class="text-lg font-semibold font-display mb-2">
          {{ cm('confirmUnassign') }}
        </h3>
        <p class="text-muted mb-6">
          {{ cm('confirmUnassignDesc') }}
        </p>
        <div class="flex justify-end gap-3">
          <UButton
            variant="ghost"
            size="sm"
            :label="$t('dashboard.button.cancel')"
            @click="cancelUnassign"
          />
          <UButton
            color="red"
            size="sm"
            :label="cm('unassign')"
            @click="unassignVenue"
          />
        </div>
      </div>
    </UModal>

    <!-- Assign new venue section -->
    <div class="px-4 pb-8">
      <h2 class="text-lg font-semibold font-display mb-3">
        {{ cm('assign') }}
      </h2>

      <div
        v-if="availableVenues.length === 0"
        class="border border-default rounded-sm p-6 text-center text-muted"
      >
        {{ cm('noAvailableVenues') }}
      </div>

      <div v-else class="flex items-end gap-3">
        <div class="flex-1">
          <USelect
            v-model="selectedVenueId"
            :items="
              availableVenues.map((c: { id: number; name: string }) => ({
                label: c.name,
                value: c.id,
              }))
            "
            :placeholder="cm('selectVenue')"
          />
        </div>
        <UButton
          :label="cm('assignBtn')"
          :disabled="!selectedVenueId"
          :loading="assigning"
          size="md"
          class="rounded-sm"
          @click="assignVenue"
        />
      </div>
    </div>
  </UContainer>
</template>
