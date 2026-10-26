<script setup lang="ts">

import type { FormSubmitEvent } from '#ui/types'
import { z } from 'zod'
import { updateProfileSchema } from '~~/shared/validator/user.schema'

definePageMeta({
    name: 'Profile',
    layout: "dashboard",
    middleware: ['auth']
})

const { csrf } = useCsrf()
const isDeleteAccountModalOpen = ref(false)
const deleting = ref(false)
const saving = ref(false)
const { loggedIn, user, fetch, clear } = useUserSession()

type SessionUser = {
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    username?: string | null
}

const sessionUser = computed<SessionUser | null>(() => user.value as SessionUser | null)

if (!loggedIn.value) {
    fetch()
}

// Transform the schema for the form state (all fields are present in state even if optional in schema)
type ProfileFormSchema = z.infer<typeof updateProfileSchema>

// Client-side refinement: changing the password requires the current one.
const formSchema = updateProfileSchema.superRefine((val, ctx) => {
    if (val.password_new && !val.password_current) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['password_current'],
            message: 'Current password is required to set a new one'
        })
    }
})

const state = reactive<ProfileFormSchema>({
    first_name: sessionUser.value?.first_name || '',
    last_name: sessionUser.value?.last_name || '',
    email: sessionUser.value?.email || '',
    username: sessionUser.value?.username || '',
    password_current: '',
    password_new: ''
})

watch(sessionUser, (value) => {
    state.username = value?.username || ''
    state.email = value?.email || ''
    state.first_name = value?.first_name || ''
    state.last_name = value?.last_name || ''
})

const toast = useToast()

function errorMessage(error: unknown): string {
    if (typeof error === 'string') return error
    if (error && typeof error === 'object') {
        const data = (error as { data?: { message?: string } }).data
        if (data?.message) return data.message
        if ('message' in error && typeof (error as { message?: string }).message === 'string') {
            return (error as { message: string }).message
        }
    }
    return 'An unknown error occurred.'
}

async function onSubmit(event: FormSubmitEvent<ProfileFormSchema>) {
    const { first_name, last_name, email, username, password_current, password_new } = event.data;

    saving.value = true
    try {
        const response = await useRequestFetch()('/api/users/me', {
            method: 'PUT',
            body: {
                first_name,
                last_name,
                email,
                username,
                password_current,
                password_new
            },
            headers: { 'csrf-token': csrf }
        });

        if (response.success) {
            toast.add({ title: 'Profile updated successfully!', icon: 'i-heroicons-check-circle', color: 'success' });
            await fetch(); // Refresh user session
            // Clear password fields after successful update
            state.password_current = '';
            state.password_new = '';
        } else {
            toast.add({ title: 'Error updating profile', description: response.message, icon: 'i-heroicons-exclamation-circle', color: 'error' });
        }
    } catch (error: unknown) {
        toast.add({ title: 'Error updating profile', description: errorMessage(error), icon: 'i-heroicons-exclamation-circle', color: 'error' });
    } finally {
        saving.value = false
    }
}

async function onDeleteAccount() {
    deleting.value = true
    try {
        await useRequestFetch()('/api/users/me', {
            method: 'DELETE',
            headers: { 'csrf-token': csrf }
        });
        toast.add({ title: $t('dashboard.profile.deletedToast'), icon: 'i-heroicons-check-circle', color: 'success' });
        await clear()
        await navigateTo('/')
    } catch (error: unknown) {
        toast.add({ title: 'Error deleting account', description: errorMessage(error), icon: 'i-heroicons-exclamation-circle', color: 'error' });
        deleting.value = false
    }
}

</script>

<template>
    <UContainer>
        <UForm :state="state" :schema="formSchema" :validate-on="['submit']" @submit="onSubmit">
            <div class="flex justify-between py-2">
                <div>
                    <h2 class="text-default font-semibold">{{ $t('dashboard.profile.title') }}</h2>
                    <p class="mt-1 text-sm text-muted">{{ $t('dashboard.profile.subtitle') }}</p>
                </div>
                <UButton type="submit" :label="$t('dashboard.profile.save')" color="black" class="h-8 rounded-sm" :loading="saving" />
            </div>

            <UDivider class="mb-4" />

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                 <UFormField name="first_name" :label="$t('dashboard.profile.firstName')" class="w-full">
                    <UInput v-model="state.first_name" autocomplete="given-name" icon="i-heroicons-user" size="md" :ui="{ rounded: 'rounded-sm' }" />
                </UFormField>
                 <UFormField name="last_name" :label="$t('dashboard.profile.lastName')" class="w-full">
                    <UInput v-model="state.last_name" autocomplete="family-name" icon="i-heroicons-user" size="md" :ui="{ rounded: 'rounded-sm' }" />
                </UFormField>
            </div>

            <UDivider class="mb-4" />
            <UFormField
name="username" :label="$t('dashboard.profile.username')"
                :description="$t('dashboard.profile.usernameHint')" required
                class="grid grid-cols-1 md:grid-cols-2 gap-2 items-center py-2" :ui="{ container: '' }">
                <UInput v-model="state.username" autocomplete="off" icon="i-heroicons-user" size="md" :ui="{ rounded: 'rounded-sm' }" />
            </UFormField>
            <UDivider class="mb-4" />
            <UFormField
name="email" :label="$t('dashboard.profile.email')"
                :description="$t('dashboard.profile.emailHint')" required
                class="grid grid-cols-1 md:grid-cols-2 gap-2 py-2" :ui="{ container: '' }">
                <UInput v-model="state.email" type="email" autocomplete="off" icon="i-heroicons-envelope" size="md" :ui="{ rounded: 'rounded-sm' }" />
            </UFormField>

            <UDivider class="mb-4" />
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 py-2 items-start">
                <div>
                    <h3 class="text-default font-semibold">{{ $t('dashboard.profile.password') }}</h3>
                    <p class="mt-1 text-sm text-muted">{{ $t('dashboard.profile.passwordHint') }}</p>
                </div>
                <div class="space-y-3">
                    <UFormField name="password_current" :label="$t('dashboard.profile.currentPassword')">
                        <UInput
v-model="state.password_current" type="password" autocomplete="current-password"
                            icon="i-heroicons-lock-closed" size="md" class="w-full" :ui="{ rounded: 'rounded-sm' }" />
                    </UFormField>
                    <UFormField name="password_new" :label="$t('dashboard.profile.newPassword')">
                        <UInput
v-model="state.password_new" type="password" autocomplete="new-password"
                            icon="i-heroicons-key" size="md" class="w-full" :ui="{ rounded: 'rounded-sm' }" />
                    </UFormField>
                </div>
            </div>
        </UForm>
        <UDivider class="mb-4" />
        <div>
            <UButton
color="error" :label="$t('dashboard.profile.deleteAccount')" variant="soft" size="md" class="rounded-sm"
                @click="isDeleteAccountModalOpen = true" />
        </div>

        <UModal
v-model:open="isDeleteAccountModalOpen" :title="$t('dashboard.profile.deleteTitle')"
            :description="$t('dashboard.profile.deleteDescription')">
            <template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <UButton
:label="$t('dashboard.profile.deleteCancel')" color="neutral" variant="outline" size="md"
                        class="rounded-sm" @click="isDeleteAccountModalOpen = false" />
                    <UButton
:label="$t('dashboard.profile.deleteConfirm')" color="error" size="md" class="rounded-sm"
                        :loading="deleting" @click="onDeleteAccount" />
                </div>
            </template>
        </UModal>
    </UContainer>
</template>
