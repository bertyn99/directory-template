<script setup lang="ts">
const { locale } = useI18n()

useHead({
  htmlAttrs: {
    lang: locale,
    dir: 'ltr'
  },
  link: [
    { rel: 'icon', type: 'image/svg+xml', sizes: 'any', href: '/favicon.svg' },
    { rel: 'icon', type: 'image/x-icon', sizes: '32x32', href: '/favicon.ico' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
    { rel: 'manifest', href: '/site.webmanifest' }
  ]
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
<style>
:root {
  --header-height: 4rem;
}
</style>