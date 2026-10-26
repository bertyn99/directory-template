<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps({
  error: Object as () => NuxtError,
})

const localePath = useLocalePath()

const title = computed(() => {
  const code = props.error?.statusCode
  if (code === 404) return 'Page not found'
  if (code === 429) return 'Too many requests'
  return 'Something went wrong'
})

const description = computed(() => {
  const code = props.error?.statusCode
  if (code === 404) return 'Sorry, we couldn’t find the page you’re looking for.'
  if (code === 429) return 'You’re browsing too fast. Wait a moment and try again.'
  return 'An unexpected error occurred. Please try again later.'
})
</script>

<template>
  <NuxtLayout name="error">
    <div class="grid min-h-screen grid-cols-1 grid-rows-[1fr,auto,1fr] bg-default lg:grid-cols-[max(50%,36rem),1fr]">
      <main class="mx-auto w-full max-w-7xl px-6 py-24 sm:py-32 lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:px-8">
        <div class="max-w-lg">
          <p class="text-6xl font-semibold leading-8 text-primary">{{ error?.statusCode }}</p>
          <h1 class="mt-4 text-2xl font-bold tracking-tight text-default font-heading uppercase sm:text-5xl">
            {{ title }}
          </h1>
          <p class="mt-6 text-base leading-7 text-muted">
            {{ description }}
          </p>
          <div class="mt-10">
            <UButton :to="localePath('/')" color="primary" class="rounded-sm">
              <span aria-hidden="true">&larr;</span> Back to home
            </UButton>
          </div>
        </div>
      </main>
    </div>
  </NuxtLayout>
</template>