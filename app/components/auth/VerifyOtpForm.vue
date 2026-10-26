<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const { setStep, email } = usePasswordReset()
const toast = useToast()
const { t } = useI18n()
const schema = z.object({
  otp: z.string().length(6, 'Code must be 6 digits')
})

type Schema = z.output<typeof schema>

const state = reactive({
  otp: ''
})

const loading = ref(false)
const { csrf } = useCsrf()
async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    const { success, message } = await $fetch('/api/auth/verify-otp', {
      method: 'POST',
      body: { 
        email: email.value,
        otp: event.data.otp 
      },
      headers: { 'csrf-token': csrf }
    })

    if (success) {
      setStep('reset')
      toast.add({ title: t('auth.success'), description: message || t('auth.codeVerified'), color: 'green' })
    }
  } catch (err: unknown) {
    toast.add({ 
      title: t('auth.error'), 
      description: (err instanceof Error && (err as { data?: { message?: string } }).data?.message) || (err instanceof Error && err.message) || t('auth.verificationFailed'), 
      color: 'red' 
    })
  } finally {
    loading.value = false
  }
}

function onResend() {
  setStep('request')
}
</script>

<template>
  <div class="space-y-6">
    <div class="text-center">
      <h1 class="text-lg font-medium">{{ $t('auth.verifyCode') }}</h1>
      <p class="text-sm text-gray-500">{{ $t('auth.enterCodeSentTo', { email }) }}</p>
    </div>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField :label="$t('auth.verificationCode')" name="otp">
        <UInput 
          v-model="state.otp" 
          type="text" 
          placeholder="123456" 
          maxlength="6"
          class="text-center tracking-widest text-lg"
        />
      </UFormField>

      <UButton type="submit" block :loading="loading">
        {{ $t('auth.verifyCode') }}
      </UButton>

      <div class="text-center text-sm">
        <button type="button" class="text-primary hover:underline" @click="onResend">
          {{ $t('auth.didntReceiveCode') }}
        </button>
      </div>
    </UForm>
  </div>
</template>
