<script setup lang="ts">

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'admin'],
})

const status = ref('PENDING')
const page = ref(1)
const pageSize = 20
const { csrf } = useCsrf()
const tabs = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' }
]

const { data: response, pending, refresh } = await useFetch('/api/admin/match-candidates', {
  query: {
    status,
    page,
    pageSize
  },
  watch: [status, page]
})

async function handleApprove(id: number) {
  try {
await $fetch(`/api/admin/match-candidates/${id}/approve`, {
method: 'POST',
      headers: { 'csrf-token': csrf }
    })
refresh()
  } catch (err: unknown) {
    console.error('Failed to approve', err)
    alert((err as { data?: { message?: string } }).data?.message || 'Failed to approve')
  }
}

async function handleReject(id: number) {
  try {
await $fetch(`/api/admin/match-candidates/${id}/reject`, {
method: 'POST',
      headers: { 'csrf-token': csrf }
    })
refresh()
  } catch (err: unknown) {
    console.error('Failed to reject', err)
    alert((err as { data?: { message?: string } }).data?.message || 'Failed to reject')
  }
}

// Reset page when status changes
watch(status, () => {
  page.value = 1
})
</script>

<template>
  <div class="max-w-6xl mx-auto p-4 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-heading font-bold uppercase tracking-wider text-secondary">
        Match Candidates
      </h1>
    </div>

    <div class="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-sm transition-colors"
        :class="status === tab.value ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'"
        @click="status = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="pending" class="flex justify-center p-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
    </div>
    
    <div v-else-if="!response?.data?.length" class="text-center p-12 border border-dashed border-gray-300 dark:border-gray-700 rounded-sm">
      <p class="text-gray-500">No match candidates found for status: {{ status }}</p>
    </div>

    <div v-else class="space-y-4">
      <AdminMatchCandidateCard
        v-for="candidate in response.data"
        :key="candidate.id"
        :candidate="candidate"
        @approve="handleApprove"
        @reject="handleReject"
      />

      <div v-if="response?.meta?.totalPages > 1" class="flex justify-center mt-8">
        <div class="flex gap-2">
          <UButton
            icon="i-lucide-chevron-left"
            variant="outline"
            class="rounded-sm"
            :disabled="page === 1"
            @click="page--"
          />
          <span class="flex items-center px-4 font-medium border border-gray-200 dark:border-gray-800 rounded-sm">
            Page {{ page }} of {{ response.meta.totalPages }}
          </span>
          <UButton
            icon="i-lucide-chevron-right"
            variant="outline"
            class="rounded-sm"
            :disabled="page >= response.meta.totalPages"
            @click="page++"
          />
        </div>
      </div>
    </div>
  </div>
</template>
