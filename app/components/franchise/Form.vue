<script setup lang="ts">
import type { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import { insertFranchiseSchema } from '~~/server/db/schemas'

const props = defineProps<{
    initialData?: z.infer<typeof insertFranchiseSchema> | null,
    closeModal: () => void
}>()

const emit = defineEmits(['submitted'])

const state = reactive<z.infer<typeof insertFranchiseSchema>>({
    name: props.initialData?.name || '',
    description: props.initialData?.description || null,
    image: props.initialData?.image || null,
    isHome: props.initialData?.isHome || false,
    socialMedia: props.initialData?.socialMedia || null,
    ownerId: props.initialData?.ownerId || undefined, // ownerId should be set by backend
})

const loading = ref(false)
const toast = useToast()
const { csrf } = useCsrf()

async function onSubmit(event: FormSubmitEvent<z.infer<typeof insertFranchiseSchema>>) {
    loading.value = true
    try {
        let response
        if (props.initialData?.id) {
            // Update existing franchise
            response = await useRequestFetch()(`/api/franchises/${props.initialData.id}`, {
                method: 'PUT',
                body: event.data,
                headers: { 'csrf-token': csrf }
            })
        } else {
            // Create new franchise
            response = await useRequestFetch()('/api/franchises', {
                method: 'POST',
                body: event.data,
                headers: { 'csrf-token': csrf }
            })
        }

        if (response) {
            toast.add({ title: `Franchise ${props.initialData?.id ? 'updated' : 'created'} successfully!`, icon: 'i-heroicons-check-circle' })
            emit('submitted')
            props.closeModal()
        }
    } catch (error: unknown) {
        let errorMessage = 'An error occurred'
        if (error instanceof Error) {
            errorMessage = error.message
        } else if (typeof error === 'object' && error !== null && 'message' in error) {
            errorMessage = (error as { message: string }).message
        }
        toast.add({ title: 'Error', description: errorMessage, icon: 'i-heroicons-exclamation-circle', color: 'red' })
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <UForm :schema="insertFranchiseSchema" :state="state" @submit="onSubmit">
        <UFormField label="Franchise Name" name="name" required class="mb-4">
            <UInput v-model="state.name" :ui="{ rounded: 'rounded-sm' }" />
        </UFormField>

        <UFormField label="Description" name="description" class="mb-4">
            <UTextarea v-model="state.description" :ui="{ rounded: 'rounded-sm' }" />
        </UFormField>

        <UFormField label="Image URL" name="image" class="mb-4">
            <UInput v-model="state.image" type="url" :ui="{ rounded: 'rounded-sm' }" />
        </UFormField>

        <UFormField label="Is Home Franchise?" name="isHome" class="mb-4">
            <UCheckbox v-model="state.isHome" :ui="{ rounded: 'rounded-sm' }" />
        </UFormField>

        <UFormField label="Social Media (JSON)" name="socialMedia" class="mb-4">
             <UTextarea v-model="state.socialMedia" :ui="{ rounded: 'rounded-sm' }" />
        </UFormField>

        <UButton type="submit" :loading="loading" class="mt-4" :ui="{ rounded: 'rounded-sm' }">
            {{ props.initialData?.id ? 'Update Franchise' : 'Create Franchise' }}
        </UButton>
    </UForm>
</template>