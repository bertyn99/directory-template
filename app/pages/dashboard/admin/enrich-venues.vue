<script setup lang="ts">

import type { FormSubmitEvent } from '#ui/types'
import { z } from 'zod'

definePageMeta({
    layout: 'dashboard',
    middleware: ['auth', 'admin']
})

const { csrf } = useCsrf()
const toast = useToast()

const mode = ref<'limit' | 'ids'>('limit')
const idsText = ref('')
const limit = ref(50)
const force = ref(false)
const locales = ref(['fr', 'en'])

const schema = z.object({
    mode: z.enum(['limit', 'ids']),
    idsText: z.string().optional(),
    limit: z.number().int().positive().max(500),
    force: z.boolean(),
    locales: z.array(z.string()).min(1, 'Pick at least one locale')
})
type Schema = z.output<typeof schema>

interface EnrichDetail {
    venueId: number
    venueName: string
    status: 'processed' | 'skipped' | 'failed'
    error?: string
    localesGenerated?: string[]
}

interface EnrichResult {
    result: string
    total: number
    processed: number
    skipped: number
    failed: number
    details: EnrichDetail[]
}

const running = ref(false)
const result = ref<EnrichResult | null>(null)

async function onSubmit(_event: FormSubmitEvent<Schema>) {
    running.value = true
    result.value = null
    try {
        const payload: Record<string, unknown> = {
            force: force.value,
            locales: locales.value
        }
        if (mode.value === 'ids') {
            const ids = idsText.value
                .split(/[\s,;]+/)
                .map(s => Number.parseInt(s, 10))
                .filter(n => Number.isInteger(n) && n > 0)
            if (ids.length === 0) {
                toast.add({ title: 'No valid venue IDs', description: 'Enter at least one numeric venue ID.', color: 'error' })
                running.value = false
                return
            }
            payload.venueIds = ids
        } else {
            payload.limit = limit.value
        }

        const response = await useRequestFetch()('/api/admin/tasks/enrich-venues', {
            method: 'POST',
            body: payload,
            headers: { 'csrf-token': csrf }
        }) as { data?: EnrichResult }

        if (response?.data) {
            result.value = response.data
            toast.add({
                title: `Enrichment finished — ${response.data.processed} processed`,
                color: response.data.failed > 0 ? 'warning' : 'success'
            })
        }
    } catch (error: unknown) {
        const message = (error as { data?: { message?: string } }).data?.message
            || (error instanceof Error ? error.message : 'Request failed')
        toast.add({ title: 'Enrichment failed', description: message, color: 'error' })
    } finally {
        running.value = false
    }
}

const statusColor: Record<EnrichDetail['status'], 'success' | 'warning' | 'error'> = {
    processed: 'success',
    skipped: 'warning',
    failed: 'error'
}

</script>

<template>
    <div class="space-y-6">
        <div>
            <h2 class="text-default font-semibold">Venue data enrichment</h2>
            <p class="mt-1 text-sm text-muted">
                Multi-page scrapes venue websites (home + schedule/pricing pages), then generates fr/en descriptions
                with AI. Thin scrapes get a short factual stub instead of padded text.
            </p>
        </div>

        <UAlert icon="i-lucide-triangle-alert" color="warning" variant="soft" class="rounded-sm">
            Runs live scraping + AI generation per venue. Keep batches small (≤50) — a batch takes several minutes.
        </UAlert>

        <UForm :schema="schema" :state="{ mode, idsText, limit, force, locales }" class="space-y-4" @submit="onSubmit">
            <UFormField label="Target selection">
                <URadioGroup
                    v-model="mode"
                    :items="[
                        { label: 'Auto batch — next venues missing a description', value: 'limit' },
                        { label: 'Specific venue IDs', value: 'ids' }
                    ]"
                />
            </UFormField>

            <UFormField v-if="mode === 'ids'" label="Venue IDs" description="Space, comma or semicolon separated" hint="Prod IDs come from the users/venues DB">
                <UTextarea v-model="idsText" class="w-full" :rows="3" placeholder="584, 1134, 1278…" />
            </UFormField>

            <UFormField v-if="mode === 'limit'" label="Batch size" description="Venues per run (max 500)">
                <UInputNumber v-model="limit" :min="1" :max="500" class="w-40" />
            </UFormField>

            <UFormField label="Locales">
                <UCheckboxGroup
                    v-model="locales"
                    :items="[
                        { label: 'French (fr)', value: 'fr' },
                        { label: 'English (en)', value: 'en' }
                    ]"
                    orientation="horizontal"
                />
            </UFormField>

            <UFormField label="Force regeneration" description="Rewrite descriptions even when one already exists">
                <USwitch v-model="force" />
            </UFormField>

            <UButton type="submit" icon="i-lucide-sparkles" :loading="running" class="rounded-sm">
                {{ running ? 'Running…' : 'Launch enrichment' }}
            </UButton>
        </UForm>

        <template v-if="result">
            <UDivider class="my-2" />
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <UCard class="rounded-sm border border-default bg-default">
                    <p class="text-2xl font-semibold text-default">{{ result.total }}</p>
                    <p class="text-xs uppercase tracking-wide text-muted">Total</p>
                </UCard>
                <UCard class="rounded-sm border border-default bg-default">
                    <p class="text-2xl font-semibold text-success">{{ result.processed }}</p>
                    <p class="text-xs uppercase tracking-wide text-muted">Processed</p>
                </UCard>
                <UCard class="rounded-sm border border-default bg-default">
                    <p class="text-2xl font-semibold text-muted">{{ result.skipped }}</p>
                    <p class="text-xs uppercase tracking-wide text-muted">Skipped</p>
                </UCard>
                <UCard class="rounded-sm border border-default bg-default">
                    <p class="text-2xl font-semibold" :class="result.failed > 0 ? 'text-error' : 'text-success'">{{ result.failed }}</p>
                    <p class="text-xs uppercase tracking-wide text-muted">Failed</p>
                </UCard>
            </div>

            <div v-if="result.details.length" class="space-y-1">
                <div v-for="d in result.details" :key="d.venueId" class="flex items-center gap-2 text-sm">
                    <UBadge :color="statusColor[d.status]" variant="soft" class="rounded-sm">{{ d.status }}</UBadge>
                    <span class="text-default">{{ d.venueName }}</span>
                    <span v-if="d.localesGenerated?.length" class="text-muted">({{ d.localesGenerated.join(', ') }})</span>
                    <span v-if="d.error" class="text-error">{{ d.error }}</span>
                </div>
            </div>
        </template>
    </div>
</template>
