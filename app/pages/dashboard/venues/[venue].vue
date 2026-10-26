<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
  title: 'Venues Details',
})

const route = useRoute()
const { t } = useI18n()
const toast = useToast()
const { csrf } = useCsrf()
const confirm = useConfirmDialog()

const venueSlug = computed(() => route.params.venue as string)

// --- Venue data ---
const { data: venue, refresh: refreshVenue } = await useAsyncData(
  `venue-detail-${venueSlug.value}`,
  () => $fetch<{ data: Record<string, unknown> }>(`/api/venues/${venueSlug.value}`),
)

const venueId = computed(() => (venue.value?.data as { id?: number })?.id)

// --- Info form ---
interface DescriptionLocale { text: string; intro: string }
const infoForm = reactive({
  id: 0,
  name: '',
  categoryId: null as number | null,
  franchiseId: null as number | null,
  searchPicture: '',
  subscription: '',
  description: {} as Record<string, DescriptionLocale>,
  website: '',
  openingHours: '',
  tel: '',
  access: {} as Record<string, string[]>,
  socialMedia: { facebook: '', twitter: '', instagram: '' },
})

const locales = ['fr', 'en', 'de', 'es', 'it', 'pt'] as const
const activeDescTab = ref(0)

function initInfoForm() {
  const c = venue.value?.data as Record<string, unknown> | undefined
  if (!c) return
  infoForm.id = c.id as number
  infoForm.name = (c.name as string) ?? ''
  infoForm.categoryId = c.categoryId as number | null
  infoForm.franchiseId = c.franchiseId as number | null
  infoForm.searchPicture = (c.searchPicture as string) ?? ''
  infoForm.subscription = (c.subscription as string) ?? ''
  infoForm.website = (c.website as string) ?? ''
  infoForm.openingHours = (c.openingHours as string) ?? ''
  infoForm.tel = (c.tel as string) ?? ''
  infoForm.socialMedia = (c.socialMedia as { facebook: string; twitter: string; instagram: string }) ?? { facebook: '', twitter: '', instagram: '' }
  infoForm.access = (c.access as Record<string, string[]>) ?? {}
  infoForm.description = (c.description as Record<string, DescriptionLocale>) ?? {}
  for (const loc of locales) {
    if (!infoForm.description[loc]) infoForm.description[loc] = { text: '', intro: '' }
    if (!infoForm.access[loc]) infoForm.access[loc] = []
  }
}

watch(() => venue.value, initInfoForm, { immediate: true })

const descLocaleItems = locales.map(l => ({ label: l.toUpperCase(), key: l }))

const infoSaving = ref(false)
async function saveInfo() {
  infoSaving.value = true
  try {
    await $fetch('/api/users/venues', {
      method: 'PUT',
      body: { ...infoForm },
      headers: { 'csrf-token': csrf },
    })
    toast.add({ title: t('dashboard.venue.save'), icon: 'i-heroicons-check-circle', color: 'success' })
    await refreshVenue()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    toast.add({ title: msg, icon: 'i-heroicons-exclamation-circle', color: 'error' })
  } finally {
    infoSaving.value = false
  }
}

// --- Location form ---
const locForm = reactive({
  id: 0,
  address: { street1: '', street2: '', zip: '', cityId: null as number | null },
})

function initLocForm() {
  const c = venue.value?.data as Record<string, unknown> | undefined
  if (!c) return
  locForm.id = c.id as number
  locForm.address = (c.address as { street1: string; street2: string; zip: string; cityId: number | null }) ?? { street1: '', street2: '', zip: '', cityId: null }
}

watch(() => venue.value, initLocForm, { immediate: true })

const { loading: loadingCities, searchCities } = useCitySearch()
const locSaving = ref(false)
async function saveLocation() {
  locSaving.value = true
  try {
    await $fetch('/api/users/venues', {
      method: 'PUT',
      body: { id: locForm.id, address: locForm.address },
      headers: { 'csrf-token': csrf },
    })
    toast.add({ title: t('dashboard.venue.save'), icon: 'i-heroicons-check-circle', color: 'success' })
    await refreshVenue()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    toast.add({ title: msg, icon: 'i-heroicons-exclamation-circle', color: 'error' })
  } finally {
    locSaving.value = false
  }
}

// --- Media ---
const { data: imagesData, refresh: refreshImages } = useFetch(
  () => venueId.value ? `/api/venues/${venueId.value}/images` : null,
  { key: `venue-images-${venueId.value}` },
)
const images = computed(() => (imagesData.value as { data?: Array<{ id: number; url: string }> })?.data ?? [])
const newImageUrl = ref('')

async function addImage() {
  if (!newImageUrl.value || !venueId.value) return
  try {
    await $fetch(`/api/venues/${venueId.value}/images`, {
      method: 'POST',
      body: { url: newImageUrl.value },
      headers: { 'csrf-token': csrf },
    })
    newImageUrl.value = ''
    await refreshImages()
    toast.add({ title: t('dashboard.venue.save'), icon: 'i-heroicons-check-circle', color: 'success' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    toast.add({ title: msg, icon: 'i-heroicons-exclamation-circle', color: 'error' })
  }
}

async function confirmDeleteImage(imgId: number) {
  const confirmed = await confirm({
    title: t('dashboard.venue.confirmDelete'),
    description: t('dashboard.venue.confirmDeleteDesc'),
  })
  if (!confirmed || !venueId.value) return
  try {
    await $fetch(`/api/venues/${venueId.value}/images/${imgId}`, {
      method: 'DELETE',
      headers: { 'csrf-token': csrf },
    })
    await refreshImages()
    toast.add({ title: t('dashboard.venue.save'), icon: 'i-heroicons-check-circle', color: 'success' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    toast.add({ title: msg, icon: 'i-heroicons-exclamation-circle', color: 'error' })
  }
}

async function setAsSearchPicture(url: string) {
  infoForm.searchPicture = url
  await saveInfo()
}

// --- Activities ---
const { data: allActivitiesData } = useFetch('/api/activities', { key: 'all-activities' })
const allActivities = computed(() => (allActivitiesData.value as { data?: Array<{ id: number; name: string; slug: string }> })?.data ?? [])

const { data: venueActivitiesData, refresh: refreshVenueActivities } = useFetch(
  () => venueId.value ? `/api/venues/${venueId.value}/activities` : null,
  { key: `venue-activities-${venueId.value}` },
)
const selectedActivityIds = ref<number[]>([])

watch(venueActivitiesData, (val) => {
  const data = (val as { data?: Array<{ activityId: number }> })?.data
  if (data) {
    selectedActivityIds.value = data.map(a => a.activityId)
  }
}, { immediate: true })

const activitiesSaving = ref(false)
async function saveActivities() {
  if (!venueId.value) return
  activitiesSaving.value = true
  try {
    await $fetch(`/api/venues/${venueId.value}/activities`, {
      method: 'PUT',
      body: { activityIds: selectedActivityIds.value },
      headers: { 'csrf-token': csrf },
    })
    await refreshVenueActivities()
    toast.add({ title: t('dashboard.venue.save'), icon: 'i-heroicons-check-circle', color: 'success' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    toast.add({ title: msg, icon: 'i-heroicons-exclamation-circle', color: 'error' })
  } finally {
    activitiesSaving.value = false
  }
}

function toggleActivity(id: number) {
  const idx = selectedActivityIds.value.indexOf(id)
  if (idx === -1) selectedActivityIds.value.push(id)
  else selectedActivityIds.value.splice(idx, 1)
}

// --- Equipments ---
const { data: allEquipmentsData } = useFetch('/api/equipments', { key: 'all-equipments' })
const allEquipments = computed(() => (allEquipmentsData.value as { data?: Array<{ id: number; name: string; slug: string }> })?.data ?? [])

const { data: venueEquipmentsData, refresh: refreshVenueEquipments } = useFetch(
  () => venueId.value ? `/api/venues/${venueId.value}/equipments` : null,
  { key: `venue-equipments-${venueId.value}` },
)
const selectedEquipmentIds = ref<number[]>([])

watch(venueEquipmentsData, (val) => {
  const data = (val as { data?: Array<{ equipmentId: number }> })?.data
  if (data) {
    selectedEquipmentIds.value = data.map(e => e.equipmentId)
  }
}, { immediate: true })

const equipmentsSaving = ref(false)
async function saveEquipments() {
  if (!venueId.value) return
  equipmentsSaving.value = true
  try {
    await $fetch(`/api/venues/${venueId.value}/equipments`, {
      method: 'PUT',
      body: { equipmentIds: selectedEquipmentIds.value },
      headers: { 'csrf-token': csrf },
    })
    await refreshVenueEquipments()
    toast.add({ title: t('dashboard.venue.save'), icon: 'i-heroicons-check-circle', color: 'success' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    toast.add({ title: msg, icon: 'i-heroicons-exclamation-circle', color: 'error' })
  } finally {
    equipmentsSaving.value = false
  }
}

function toggleEquipment(id: number) {
  const idx = selectedEquipmentIds.value.indexOf(id)
  if (idx === -1) selectedEquipmentIds.value.push(id)
  else selectedEquipmentIds.value.splice(idx, 1)
}

// --- Events ---
const { data: eventsData, refresh: refreshEvents } = useFetch(
  () => venueId.value ? `/api/venues/${venueId.value}/events` : null,
  { key: `venue-events-${venueId.value}` },
)
const events = computed(() => (eventsData.value as { data?: Array<{ id: number; name: string; startDate?: string; description?: string }> })?.data ?? [])

const newEvent = reactive({ name: '', description: '', startDate: '', endDate: '' })
const eventCreating = ref(false)

async function createEvent() {
  if (!newEvent.name || !venueId.value) return
  eventCreating.value = true
  try {
    await $fetch(`/api/venues/${venueId.value}/events`, {
      method: 'POST',
      body: {
        name: newEvent.name,
        description: newEvent.description || undefined,
        startDate: newEvent.startDate ? new Date(newEvent.startDate).toISOString() : undefined,
        endDate: newEvent.endDate ? new Date(newEvent.endDate).toISOString() : undefined,
      },
      headers: { 'csrf-token': csrf },
    })
    newEvent.name = ''
    newEvent.description = ''
    newEvent.startDate = ''
    newEvent.endDate = ''
    await refreshEvents()
    toast.add({ title: t('dashboard.venue.save'), icon: 'i-heroicons-check-circle', color: 'success' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    toast.add({ title: msg, icon: 'i-heroicons-exclamation-circle', color: 'error' })
  } finally {
    eventCreating.value = false
  }
}

async function confirmDeleteEvent(id: number) {
  const confirmed = await confirm({
    title: t('dashboard.venue.confirmDelete'),
    description: t('dashboard.venue.confirmDeleteDesc'),
  })
  if (!confirmed || !venueId.value) return
  try {
    await $fetch(`/api/venues/${venueId.value}/events/${id}`, {
      method: 'DELETE',
      headers: { 'csrf-token': csrf },
    })
    await refreshEvents()
    toast.add({ title: t('dashboard.venue.save'), icon: 'i-heroicons-check-circle', color: 'success' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    toast.add({ title: msg, icon: 'i-heroicons-exclamation-circle', color: 'error' })
  }
}

// --- Formulas ---
const { data: formulasData, refresh: refreshFormulas } = useFetch(
  () => venueId.value ? `/api/venues/${venueId.value}/formulas` : null,
  { key: `venue-formulas-${venueId.value}` },
)
const formulas = computed(() => (formulasData.value as { data?: Array<{ id: number; name: string; type: string; price: string; infos?: string }> })?.data ?? [])

const newFormula = reactive({ type: '', name: '', price: '', infos: '' })
const formulaCreating = ref(false)

async function createFormula() {
  if (!newFormula.name || !newFormula.type || !newFormula.price || !venueId.value) return
  formulaCreating.value = true
  try {
    await $fetch(`/api/venues/${venueId.value}/formulas`, {
      method: 'POST',
      body: {
        type: newFormula.type,
        name: newFormula.name,
        price: newFormula.price,
        infos: newFormula.infos || undefined,
      },
      headers: { 'csrf-token': csrf },
    })
    newFormula.type = ''
    newFormula.name = ''
    newFormula.price = ''
    newFormula.infos = ''
    await refreshFormulas()
    toast.add({ title: t('dashboard.venue.save'), icon: 'i-heroicons-check-circle', color: 'success' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    toast.add({ title: msg, icon: 'i-heroicons-exclamation-circle', color: 'error' })
  } finally {
    formulaCreating.value = false
  }
}

async function confirmDeleteFormula(id: number) {
  const confirmed = await confirm({
    title: t('dashboard.venue.confirmDelete'),
    description: t('dashboard.venue.confirmDeleteDesc'),
  })
  if (!confirmed || !venueId.value) return
  try {
    await $fetch(`/api/venues/${venueId.value}/formulas/${id}`, {
      method: 'DELETE',
      headers: { 'csrf-token': csrf },
    })
    await refreshFormulas()
    toast.add({ title: t('dashboard.venue.save'), icon: 'i-heroicons-check-circle', color: 'success' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    toast.add({ title: msg, icon: 'i-heroicons-exclamation-circle', color: 'error' })
  }
}

// --- Tabs ---
const tabItems = computed(() => [
  { label: t('dashboard.venue.tabs.info'), icon: 'i-lucide-info', slot: 'info' },
  { label: t('dashboard.venue.tabs.location'), icon: 'i-lucide-map-pin', slot: 'location' },
  { label: t('dashboard.venue.tabs.media'), icon: 'i-lucide-image', slot: 'media' },
  { label: t('dashboard.venue.tabs.activities'), icon: 'i-lucide-bolt', slot: 'activities' },
  { label: t('dashboard.venue.tabs.events'), icon: 'i-lucide-calendar', slot: 'events' },
  { label: t('dashboard.venue.tabs.pricing'), icon: 'i-lucide-credit-card', slot: 'formulas' },
])
</script>

<template>
  <UContainer>
    <h1 class="text-2xl font-bold mb-6 font-display uppercase">
      {{ (venue?.data as Record<string, unknown>)?.name ?? $t('dashboard.venue.tabs.info') }}
    </h1>

    <UTabs :items="tabItems" class="w-full" :ui="{ list: { rounded: 'rounded-sm' } }">
      <!-- ==================== INFO TAB ==================== -->
      <template #info>
        <div class="space-y-6 py-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField :label="$t('dashboard.venue.name')" name="name">
              <UInput v-model="infoForm.name" :ui="{ rounded: 'rounded-sm' }" />
            </UFormField>
            <UFormField :label="$t('dashboard.venue.tel')" name="tel">
              <UInput v-model="infoForm.tel" :ui="{ rounded: 'rounded-sm' }" />
            </UFormField>
            <UFormField :label="$t('dashboard.venue.website')" name="website" class="md:col-span-2">
              <UInput v-model="infoForm.website" :ui="{ rounded: 'rounded-sm' }" />
            </UFormField>
          </div>

          <UFormField :label="$t('dashboard.venue.openingHours')" name="openingHours">
            <UTextarea v-model="infoForm.openingHours" :ui="{ rounded: 'rounded-sm' }" />
          </UFormField>

          <!-- Description -->
          <UFormField :label="$t('dashboard.venue.description')" name="description">
            <UTabs v-model="activeDescTab" :items="descLocaleItems">
              <template #item="{ item }">
                <div class="space-y-2 pt-2">
                  <UTextarea
                    v-if="infoForm.description[item.key]"
                    v-model="infoForm.description[item.key].text"
                    :placeholder="$t('dashboard.venue.text')"
                    :ui="{ rounded: 'rounded-sm' }"
                  />
                  <UTextarea
                    v-if="infoForm.description[item.key]"
                    v-model="infoForm.description[item.key].intro"
                    :placeholder="$t('dashboard.venue.intro')"
                    :ui="{ rounded: 'rounded-sm' }"
                  />
                </div>
              </template>
            </UTabs>
          </UFormField>

          <!-- Social media -->
          <UFormField :label="$t('dashboard.venue.socialMedia')" name="socialMedia">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <UInput v-model="infoForm.socialMedia.facebook" :placeholder="$t('dashboard.venue.socialFacebook')" :ui="{ rounded: 'rounded-sm' }" />
              <UInput v-model="infoForm.socialMedia.twitter" :placeholder="$t('dashboard.venue.socialTwitter')" :ui="{ rounded: 'rounded-sm' }" />
              <UInput v-model="infoForm.socialMedia.instagram" :placeholder="$t('dashboard.venue.socialInstagram')" :ui="{ rounded: 'rounded-sm' }" />
            </div>
          </UFormField>

          <UButton :loading="infoSaving" class="rounded-sm" @click="saveInfo">
            {{ $t('dashboard.venue.save') }}
          </UButton>
        </div>
      </template>

      <!-- ==================== LOCATION TAB ==================== -->
      <template #location>
        <div class="space-y-4 py-4">
          <UFormField :label="$t('dashboard.venue.street')" name="street1">
            <UInput v-model="locForm.address.street1" :ui="{ rounded: 'rounded-sm' }" />
          </UFormField>
          <UFormField :label="$t('dashboard.venue.street2')" name="street2">
            <UInput v-model="locForm.address.street2" :ui="{ rounded: 'rounded-sm' }" />
          </UFormField>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField :label="$t('dashboard.venue.zip')" name="zip">
              <UInput v-model="locForm.address.zip" :ui="{ rounded: 'rounded-sm' }" />
            </UFormField>
            <UFormField :label="$t('dashboard.venue.city')">
              <USelectMenu
                v-model="locForm.address.cityId"
                :loading="loadingCities"
                :searchable="searchCities"
                value-key="id"
                option-label="name"
                :placeholder="$t('dashboard.venue.city')"
                searchable-lazy
                :ui="{ rounded: 'rounded-sm' }"
              />
            </UFormField>
          </div>
          <UButton :loading="locSaving" class="rounded-sm" @click="saveLocation">
            {{ $t('dashboard.venue.save') }}
          </UButton>
        </div>
      </template>

      <!-- ==================== MEDIA TAB ==================== -->
      <template #media>
        <div class="space-y-6 py-4">
          <!-- Search picture -->
          <UFormField :label="$t('dashboard.venue.searchPicture')" name="searchPicture">
            <UInput v-model="infoForm.searchPicture" :ui="{ rounded: 'rounded-sm' }" />
          </UFormField>

          <!-- Add image -->
          <div class="flex gap-2 items-end">
            <UFormField :label="$t('dashboard.venue.imageUrl')" name="imageUrl" class="flex-1">
              <UInput v-model="newImageUrl" placeholder="https://..." :ui="{ rounded: 'rounded-sm' }" />
            </UFormField>
            <UButton class="rounded-sm" :disabled="!newImageUrl" @click="addImage">
              {{ $t('dashboard.button.add') }}
            </UButton>
          </div>

          <!-- Image grid -->
          <div v-if="images.length" class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div
              v-for="img in images"
              :key="img.id"
              class="relative border border-default rounded-sm overflow-hidden group"
            >
              <img :src="img.url" :alt="$t('dashboard.venue.tabs.media')" class="w-full h-32 object-cover" >
              <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2">
                <UButton size="xs" variant="ghost" icon="i-lucide-star" :title="$t('dashboard.venue.setSearchPicture')" :aria-label="$t('dashboard.venue.setSearchPicture')" @click="setAsSearchPicture(img.url)" />
                <UButton size="xs" variant="ghost" icon="i-lucide-trash" color="error" :aria-label="$t('dashboard.venue.confirmDelete')" @click="confirmDeleteImage(img.id)" />
              </div>
            </div>
          </div>
          <p v-else class="text-muted text-sm">{{ $t('dashboard.empty.noImages') }}</p>

          <UButton :loading="infoSaving" class="rounded-sm" @click="saveInfo">
            {{ $t('dashboard.venue.save') }}
          </UButton>
        </div>
      </template>

      <!-- ==================== ACTIVITIES TAB ==================== -->
      <template #activities>
        <div class="space-y-6 py-4">
          <!-- Activities -->
          <div>
            <h3 class="font-medium text-default mb-3">{{ $t('dashboard.venue.tabs.activities') }}</h3>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              <button
                v-for="activity in allActivities"
                :key="activity.id"
                class="border rounded-sm px-3 py-2 text-left text-sm transition-colors duration-150 cursor-pointer"
                :class="selectedActivityIds.includes(activity.id)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-default hover:border-primary/50'"
                @click="toggleActivity(activity.id)"
              >
                {{ activity.name || activity.slug }}
              </button>
            </div>
          </div>

          <!-- Equipments -->
          <div>
            <h3 class="font-medium text-default mb-3">{{ $t('dashboard.venue.tabs.activities') }}</h3>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              <button
                v-for="equip in allEquipments"
                :key="equip.id"
                class="border rounded-sm px-3 py-2 text-left text-sm transition-colors duration-150 cursor-pointer"
                :class="selectedEquipmentIds.includes(equip.id)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-default hover:border-primary/50'"
                @click="toggleEquipment(equip.id)"
              >
                {{ equip.name || equip.slug }}
              </button>
            </div>
          </div>

          <UButton :loading="activitiesSaving || equipmentsSaving" class="rounded-sm" @click="saveActivities(); saveEquipments()">
            {{ $t('dashboard.venue.save') }}
          </UButton>
        </div>
      </template>

      <!-- ==================== EVENTS TAB ==================== -->
      <template #events>
        <div class="space-y-6 py-4">
          <!-- Event list -->
          <div v-if="events.length" class="space-y-2">
            <div
              v-for="evt in events"
              :key="evt.id"
              class="flex items-center justify-between border border-default rounded-sm px-4 py-3"
            >
              <div>
                <p class="font-medium text-default">{{ evt.name }}</p>
                <p v-if="evt.startDate" class="text-sm text-muted">
                  {{ new Date(evt.startDate).toLocaleDateString() }}
                </p>
              </div>
              <UButton
                variant="ghost"
                icon="i-lucide-trash"
                color="error"
                size="sm"
                @click="confirmDeleteEvent(evt.id)"
              />
            </div>
          </div>
          <p v-else class="text-muted text-sm">{{ $t('dashboard.empty.noEvents') }}</p>

          <!-- Create event -->
          <div class="border border-default rounded-sm p-4 space-y-3">
            <h3 class="font-medium text-default">{{ $t('dashboard.event.add') }}</h3>
            <UFormField :label="$t('dashboard.event.name')">
              <UInput v-model="newEvent.name" :ui="{ rounded: 'rounded-sm' }" />
            </UFormField>
            <UFormField :label="$t('dashboard.event.description')">
              <UTextarea v-model="newEvent.description" :ui="{ rounded: 'rounded-sm' }" />
            </UFormField>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField :label="$t('dashboard.event.startDate')">
                <UInput v-model="newEvent.startDate" type="datetime-local" :ui="{ rounded: 'rounded-sm' }" />
              </UFormField>
              <UFormField :label="$t('dashboard.event.endDate')">
                <UInput v-model="newEvent.endDate" type="datetime-local" :ui="{ rounded: 'rounded-sm' }" />
              </UFormField>
            </div>
            <UButton :loading="eventCreating" :disabled="!newEvent.name" class="rounded-sm" @click="createEvent">
              {{ $t('dashboard.button.create') }}
            </UButton>
          </div>
        </div>
      </template>

      <!-- ==================== FORMULAS TAB ==================== -->
      <template #formulas>
        <div class="space-y-6 py-4">
          <!-- Formula list -->
          <div v-if="formulas.length" class="space-y-2">
            <div
              v-for="f in formulas"
              :key="f.id"
              class="flex items-center justify-between border border-default rounded-sm px-4 py-3"
            >
              <div>
                <p class="font-medium text-default">{{ f.name }}</p>
                <p class="text-sm text-muted">{{ f.type }} &middot; {{ f.price }}</p>
                <p v-if="f.infos" class="text-xs text-muted mt-1">{{ f.infos }}</p>
              </div>
              <UButton
                variant="ghost"
                icon="i-lucide-trash"
                color="error"
                size="sm"
                @click="confirmDeleteFormula(f.id)"
              />
            </div>
          </div>
          <p v-else class="text-muted text-sm">{{ $t('dashboard.empty.noFormulas') }}</p>

          <!-- Create formula -->
          <div class="border border-default rounded-sm p-4 space-y-3">
            <h3 class="font-medium text-default">{{ $t('dashboard.formula.add') }}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField :label="$t('dashboard.formula.type')">
                <UInput v-model="newFormula.type" :ui="{ rounded: 'rounded-sm' }" />
              </UFormField>
              <UFormField :label="$t('dashboard.formula.name')">
                <UInput v-model="newFormula.name" :ui="{ rounded: 'rounded-sm' }" />
              </UFormField>
              <UFormField :label="$t('dashboard.formula.price')">
                <UInput v-model="newFormula.price" :ui="{ rounded: 'rounded-sm' }" />
              </UFormField>
              <UFormField :label="$t('dashboard.formula.infos')">
                <UInput v-model="newFormula.infos" :ui="{ rounded: 'rounded-sm' }" />
              </UFormField>
            </div>
            <UButton
              :loading="formulaCreating"
              :disabled="!newFormula.name || !newFormula.type || !newFormula.price"
              class="rounded-sm"
              @click="createFormula"
            >
              {{ $t('dashboard.button.create') }}
            </UButton>
          </div>
        </div>
      </template>
    </UTabs>
  </UContainer>
</template>
