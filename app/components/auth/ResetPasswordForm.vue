<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const { email } = usePasswordReset()
const toast = useToast()
const router = useRouter()
const { t } = useI18n()
const { csrf } = useCsrf()

const schema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type Schema = z.output<typeof schema>

const state = reactive({
  password: '',
  confirmPassword: ''
})

const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    const { success, message } = await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { 
        email: email.value,
        password: event.data.password 
      },
      headers: { 'csrf-token': csrf }
    })

    if (success) {
      toast.add({ 
        title: t('auth.success'), 
        description: message || t('auth.passwordResetSuccess'), 
        color: 'green',
        icon: 'i-heroicons-check-circle' // Using heroicons as per nuxt-ui
      })
      router.push('/auth/login')
    }
  } catch (err: unknown) {
    toast.add({ 
      title: t('auth.error'), 
      description: (err instanceof Error && (err as { data?: { message?: string } }).data?.message) || (err instanceof Error && err.message) || t('auth.failedToResetPassword'), 
      color: 'red',
      icon: 'i-heroicons-exclamation-circle'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="text-center">
      <h1 class="text-lg font-medium font-display uppercase">{{ $t('auth.newPassword') }}</h1>
      <p class="text-sm text-gray-500 text-muted">{{ $t('auth.createNewSecurePassword') }}</p>
    </div>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField :label="$t('auth.newPassword')" name="password">
        <UInput v-model="state.password" type="password" placeholder="••••••••" :ui="{ rounded: 'rounded-sm' }" />
      </UFormField>

      <UFormField :label="$t('auth.confirmPassword')" name="confirmPassword">
        <UInput v-model="state.confirmPassword" type="password" placeholder="••••••••" :ui="{ rounded: 'rounded-sm' }" />
      </UFormField>

      <UButton type="submit" block :loading="loading" :ui="{ rounded: 'rounded-sm' }">
        {{ $t('auth.resetPassword') }}
      </UButton>
    </UForm>
  </div>
</template>
