<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const { setStep, setEmail } = usePasswordReset()
const toast = useToast()
const { t } = useI18n()
const schema = z.object({
  email: z.string().email('Invalid email address')
})

type Schema = z.output<typeof schema>

const state = reactive({
  email: ''
})

const loading = ref(false)
const { csrf } = useCsrf()
async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    const { success, message, error } = await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: event.data.email },
      headers: { 'csrf-token': csrf }
    })

    if (success) {
      setEmail(event.data.email)
      setStep('verify')
      toast.add({ title: t('auth.success'), description: message || t('auth.codeSent'), color: 'green' })
    } else {
       toast.add({ title: t('auth.error'), description: error?.message || t('auth.somethingWentWrong'), color: 'red' })
    }
  } catch (err: unknown) {
    toast.add({ 
      title: t('auth.error'), 
      description: (err instanceof Error && (err as { data?: { message?: string } }).data?.message) || (err instanceof Error && err.message) || t('auth.failedToSendRequest'), 
      color: 'red' 
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="text-center">
      <h1 class="text-lg font-medium">{{ $t('auth.resetPassword') }}</h1>
      <p class="text-sm text-gray-500">{{ $t('auth.enterEmailToReceiveCode') }}</p>
    </div>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField :label="$t('auth.email')" name="email">
        <UInput v-model="state.email" type="email" placeholder="you@example.com" />
      </UFormField>

      <UButton type="submit" block :loading="loading">
        {{ $t('auth.sendCode') }}
      </UButton>
      
      <div class="text-center text-sm">
        <NuxtLink to="/auth/login" class="text-primary hover:underline">
          {{ $t('auth.backToLogin') }}
        </NuxtLink>
      </div>
    </UForm>
  </div>
</template>
