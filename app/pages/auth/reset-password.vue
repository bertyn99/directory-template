<script setup lang="ts">
definePageMeta({
  layout: 'auth',
});

const { step } = usePasswordReset();

// H1 for SEO/a11y — the form components render their own visible text,
// but none produce an <h1>. This sr-only h1 satisfies the heading hierarchy
// without visual regression on the minimal auth layout.
const headingText = computed(() => {
  switch (step) {
    case 'verify': return 'Verify your email'
    case 'reset': return 'Set a new password'
    default: return 'Reset your password'
  }
})
</script>

<template>
  <UContainer class="flex items-center justify-center min-h-screen py-12">
    <UCard class="w-full max-w-md p-6 border border-default rounded-sm">
      <h1 class="sr-only">{{ headingText }}</h1>
      <template v-if="step === 'request'">
        <ForgotPasswordForm />
      </template>
      <template v-else-if="step === 'verify'">
        <VerifyOtpForm />
      </template>
      <template v-else-if="step === 'reset'">
        <ResetPasswordForm />
      </template>
    </UCard>
  </UContainer>
</template>
