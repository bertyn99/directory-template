<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types'
import type { z } from 'zod'
import { Motion } from 'motion-v'
import { updateProfileSchema } from '~~/shared/validator/user.schema'

definePageMeta({
  name: 'Settings',
  layout: 'dashboard',
  middleware: ['auth'],
})

const { csrf } = useCsrf()
const isDeleteAccountModalOpen = ref(false)
const { loggedIn, user, fetch } = useUserSession()
const { t } = useI18n()
const { fadeSlideIn, fadeSlideInTransition, scaleIn, scaleInTransition } = useDashboardAnimations()

const sessionUser = computed(() => user.value)

if (!loggedIn.value) {
  fetch()
}

type ProfileFormSchema = z.infer<typeof updateProfileSchema>

const state = reactive<ProfileFormSchema>({
  first_name: sessionUser.value?.firstName || '',
  last_name: sessionUser.value?.lastName || '',
  email: sessionUser.value?.email || '',
  username: sessionUser.value?.username || '',
  password_current: '',
  password_new: '',
})

watch(sessionUser, (value) => {
  state.username = value?.username || ''
  state.email = value?.email || ''
  state.first_name = value?.firstName || ''
  state.last_name = value?.lastName || ''
})

const toast = useToast()

async function onSubmit(event: FormSubmitEvent<ProfileFormSchema>) {
  const { first_name, last_name, email, username, password_current, password_new } = event.data

  try {
    const response = await useRequestFetch()('/api/users/me', {
      method: 'PUT',
      body: {
        first_name,
        last_name,
        email,
        username,
        password_current,
        password_new,
      },
      headers: { 'csrf-token': csrf },
    })

    if (response.success) {
      toast.add({ title: t('dashboard.settings.profile.save'), icon: 'i-heroicons-check-circle' })
      await fetch()
      state.password_current = ''
      state.password_new = ''
    }
    else {
      toast.add({ title: t('dashboard.settings.profile.save'), description: response.message, icon: 'i-heroicons-exclamation-circle', color: 'red' })
    }
  }
  catch (error: unknown) {
    let errorMessage = 'An unknown error occurred.'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    else if (typeof error === 'object' && error !== null && 'message' in error) {
      errorMessage = (error as { message: string }).message
    }
    toast.add({ title: t('dashboard.settings.profile.save'), description: errorMessage, icon: 'i-heroicons-exclamation-circle', color: 'red' })
  }
}

async function handleDeleteAccount() {
  try {
    const response = await useRequestFetch()('/api/users/me', {
      method: 'DELETE',
      headers: { 'csrf-token': csrf },
    })
    if (response.success) {
      toast.add({ title: t('dashboard.settings.profile.accountDeleted'), icon: 'i-heroicons-check-circle' })
      await navigateTo('/')
    }
  }
  catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    toast.add({ title: t('dashboard.settings.profile.deleteError'), description: msg, icon: 'i-heroicons-exclamation-circle', color: 'red' })
  }
  isDeleteAccountModalOpen.value = false
}

</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <Motion :variants="fadeSlideIn" initial="hidden" animate="visible" :transition="fadeSlideInTransition">
      <div>
        <h2 class="text-xl font-semibold font-display">{{ $t('dashboard.settings.title') }}</h2>
        <p class="text-sm text-muted mt-1">{{ $t('dashboard.settings.subtitle') }}</p>
      </div>
    </Motion>

    <!-- Tab Navigation -->
    <div class="flex gap-1 border-b border-default">
      <NuxtLink
        to="/dashboard/settings"
        class="relative px-4 py-2 text-sm font-medium transition-colors duration-150 text-primary border-b-2 border-primary"
      >
        {{ $t('dashboard.settings.tabs.profile') }}
      </NuxtLink>
      <NuxtLink
        to="/dashboard/settings/billing"
        class="relative px-4 py-2 text-sm font-medium transition-colors duration-150 text-muted hover:text-default border-b-2 border-transparent hover:border-muted"
      >
        {{ $t('dashboard.settings.tabs.billing') }}
      </NuxtLink>
    </div>

    <!-- Profile Form -->
    <Motion :variants="fadeSlideIn" initial="hidden" animate="visible" :transition="fadeSlideInTransition">
      <UForm :state="state" :schema="updateProfileSchema" :validate-on="['submit']" @submit="onSubmit">
        <div class="flex justify-between py-2">
          <div>
            <h3 class="text-lg font-semibold font-display">{{ $t('dashboard.settings.profile.title') }}</h3>
            <p class="mt-1 text-sm text-muted">{{ $t('dashboard.settings.profile.subtitle') }}</p>
          </div>
          <Motion
            :while-press="{ scale: 0.98 }"
            :transition="{ duration: 0.1 }"
          >
            <UButton type="submit" :label="$t('dashboard.settings.profile.save')" color="black" class="h-8 rounded-sm" />
          </Motion>
        </div>

        <UDivider class="mb-4" />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <UFormField name="first_name" :label="$t('dashboard.settings.profile.firstName')" class="w-full">
            <UInput v-model="state.first_name" autocomplete="given-name" icon="i-heroicons-user" size="md" :ui="{ rounded: 'rounded-sm' }" />
          </UFormField>
          <UFormField name="last_name" :label="$t('dashboard.settings.profile.lastName')" class="w-full">
            <UInput v-model="state.last_name" autocomplete="family-name" icon="i-heroicons-user" size="md" :ui="{ rounded: 'rounded-sm' }" />
          </UFormField>
        </div>

        <UDivider class="mb-4" />
        <UFormField
          name="username"
          :label="$t('dashboard.settings.profile.username')"
          :description="$t('dashboard.settings.profile.usernameHint')"
          required
          class="grid grid-cols-1 md:grid-cols-2 gap-2 items-center py-2"
          :ui="{ container: '' }"
        >
          <UInput v-model="state.username" autocomplete="off" icon="i-heroicons-user" size="md" :ui="{ rounded: 'rounded-sm' }" />
        </UFormField>

        <UDivider class="mb-4" />
        <UFormField
          name="email"
          :label="$t('dashboard.settings.profile.email')"
          :description="$t('dashboard.settings.profile.emailHint')"
          required
          class="grid grid-cols-1 md:grid-cols-2 gap-2 py-2"
          :ui="{ container: '' }"
        >
          <UInput v-model="state.email" type="email" autocomplete="off" icon="i-heroicons-envelope" size="md" disabled :ui="{ rounded: 'rounded-sm' }" />
        </UFormField>

        <UDivider class="mb-4" />
        <UFormField
          name="password_new"
          :label="$t('dashboard.settings.profile.password')"
          :description="$t('dashboard.settings.profile.passwordHint')"
          class="grid grid-cols-1 md:grid-cols-2 gap-2 py-2"
          :ui="{ container: '' }"
        >
          <div class="space-y-2">
            <UInput
              v-model="state.password_current"
              type="password"
              :placeholder="$t('dashboard.settings.profile.currentPassword')"
              size="md"
              :ui="{ rounded: 'rounded-sm' }"
            />
            <UInput
              v-model="state.password_new"
              type="password"
              :placeholder="$t('dashboard.settings.profile.newPassword')"
              size="md"
              :ui="{ rounded: 'rounded-sm' }"
            />
          </div>
        </UFormField>
      </UForm>
    </Motion>

    <!-- Delete Account -->
    <Motion :variants="fadeSlideIn" initial="hidden" animate="visible" :transition="{ ...fadeSlideInTransition, delay: 0.1 }">
      <UDivider class="mb-4" />
      <div>
        <Motion :while-press="{ scale: 0.98 }" :transition="{ duration: 0.1 }">
          <UButton
            color="red"
            :label="$t('dashboard.settings.profile.deleteAccount')"
            variant="soft"
            size="md"
            class="rounded-sm"
            @click="isDeleteAccountModalOpen = true"
          />
        </Motion>
      </div>
    </Motion>

    <!-- Delete account confirmation modal -->
    <ClientOnly>
      <UModal v-model:open="isDeleteAccountModalOpen">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-2">{{ $t('dashboard.settings.profile.deleteAccount') }}</h3>
          <p class="text-muted text-sm mb-6">{{ $t('dashboard.settings.profile.deleteAccountDesc') }}</p>
          <div class="flex gap-3 justify-end">
            <UButton color="neutral" variant="soft" @click="isDeleteAccountModalOpen = false">
              {{ $t('dashboard.button.cancel') }}
            </UButton>
            <UButton color="error" @click="handleDeleteAccount">
              {{ $t('dashboard.settings.profile.deleteAccount') }}
            </UButton>
          </div>
        </div>
      </UModal>
    </ClientOnly>
  </div>
</template>
