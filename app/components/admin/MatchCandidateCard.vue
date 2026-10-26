<script setup lang="ts">
import { computed } from 'vue'
import type { getMatchCandidates } from '~~/server/db/queries/matchCandidates'

/** Row shape returned by GET /api/admin/match-candidates. */
type MatchCandidate = Awaited<ReturnType<typeof getMatchCandidates>>['data'][number]
type CandidateAddress = NonNullable<MatchCandidate['venueSource']>['address']

const props = defineProps<{
  candidate: MatchCandidate
}>()

const emit = defineEmits<{
  approve: [id: number]
  reject: [id: number]
}>()

const score = computed(() => {
  const val = parseFloat(props.candidate.score)
  return isNaN(val) ? 0 : Math.round(val * 100)
})

const badgeColor = computed(() => {
  if (score.value >= 85) return 'success'
  if (score.value >= 65) return 'warning'
  return 'error'
})

function formatAddress(address: CandidateAddress | null | undefined) {
  if (!address) return 'N/A'
  const parts = [
    address.street1,
    address.street2,
    address.zip,
    address.city?.name,
    address.city?.country?.name
  ]
  return parts.filter(Boolean).join(', ')
}

/** Prepends https:// to URLs missing a protocol so browsers don't treat them as relative paths. */
function ensureUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//.test(url)) return url;
  return `https://${url}`;
}
</script>

<template>
  <UCard
    :ui="{
      root: 'rounded-sm shadow-none border border-gray-200 dark:border-gray-800'
    }"
  >
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <h3 class="text-lg font-bold font-heading">Match #{{ candidate.id }}</h3>
        <UBadge :color="badgeColor" variant="subtle" class="rounded-sm">
          Score: {{ score }}%
        </UBadge>
        <UBadge v-if="candidate.status !== 'PENDING'" color="neutral" variant="outline" class="rounded-sm">
          {{ candidate.status }}
        </UBadge>
      </div>
      <div v-if="candidate.status === 'PENDING'" class="flex items-center gap-2">
        <UButton
          color="error"
          variant="outline"
          class="rounded-sm"
          @click="emit('reject', candidate.id)"
        >
          {{ $t('admin.reject') }}
        </UButton>
        <UButton
          color="success"
          class="rounded-sm"
          @click="emit('approve', candidate.id)"
        >
          {{ $t('admin.approve') }}
        </UButton>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Left: Source -->
      <div class="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Scraped Data (Source: {{ candidate.venueSource?.sourceCode }})</div>
        <div class="space-y-3 text-sm">
          <div>
            <div class="text-gray-500 text-xs">{{ $t('admin.name') }}</div>
            <div class="font-medium">{{ candidate.venueSource?.name || 'N/A' }}</div>
          </div>
          <div>
            <div class="text-gray-500 text-xs">{{ $t('admin.address') }}</div>
            <div>{{ formatAddress(candidate.venueSource?.address) }}</div>
          </div>
          <div>
            <div class="text-gray-500 text-xs">{{ $t('admin.phone') }}</div>
            <div>{{ candidate.venueSource?.tel || 'N/A' }}</div>
          </div>
          <div>
            <div class="text-gray-500 text-xs">{{ $t('admin.website') }}</div>
            <a v-if="candidate.venueSource?.website" :href="ensureUrl(candidate.venueSource.website)" target="_blank" class="text-primary hover:underline truncate block">
              {{ candidate.venueSource.website }}
            </a>
            <span v-else>N/A</span>
          </div>
          <div>
            <div class="text-gray-500 text-xs">{{ $t('admin.sourceUrl') }}</div>
            <a v-if="candidate.venueSource?.url" :href="candidate.venueSource.url" target="_blank" class="text-primary hover:underline truncate block">
              {{ candidate.venueSource.url }}
            </a>
          </div>
        </div>
      </div>

      <!-- Right: Existing Venue -->
      <div class="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Existing Venue ID: {{ candidate.existingVenue?.id }}</div>
        <div class="space-y-3 text-sm">
          <div>
            <div class="text-gray-500 text-xs">{{ $t('admin.name') }}</div>
            <div class="font-medium">{{ candidate.existingVenue?.name || 'N/A' }}</div>
          </div>
          <div>
            <div class="text-gray-500 text-xs">{{ $t('admin.address') }}</div>
            <div>{{ formatAddress(candidate.existingVenue?.address) }}</div>
          </div>
          <div>
            <div class="text-gray-500 text-xs">{{ $t('admin.phone') }}</div>
            <div>{{ candidate.existingVenue?.tel || candidate.existingVenue?.canonicalPhone || 'N/A' }}</div>
          </div>
          <div>
            <div class="text-gray-500 text-xs">{{ $t('admin.website') }}</div>
            <a v-if="candidate.existingVenue?.website" :href="ensureUrl(candidate.existingVenue.website)" target="_blank" class="text-primary hover:underline truncate block">
              {{ candidate.existingVenue.website }}
            </a>
            <span v-else>N/A</span>
          </div>
          <div>
            <div class="text-gray-500 text-xs">{{ $t('admin.statusTrust') }}</div>
            <div>{{ candidate.existingVenue?.status }} / {{ candidate.existingVenue?.trustRank || 0 }}</div>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
