<script setup lang="ts">
/**
 * City hub at the legacy-prefixed URL /country/{country}/{city} — canonical
 * shape for the 'category-city' pattern; in 'country-city-category' mode the
 * named middleware 301s to the bare chain URL /{country}/{city} (the global
 * redirect-city-chain middleware rewrites it first on SSR — this page
 * middleware is the client-side-nav safety net). Both shapes render the same
 * body (CityHubPage).
 */
definePageMeta({
  middleware: ['redirect-city-hub-chain'],
})
</script>

<template>
  <CityHubPage />
</template>
