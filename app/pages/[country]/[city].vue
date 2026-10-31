<script setup lang="ts">
/**
 * City hub at the bare chain URL /{country}/{city} — canonical shape for the
 * 'country-city-category' pattern; in 'category-city' mode the named
 * middleware 301s back to /country/{country}/{city}. Both shapes render the
 * same body (CityHubPage — app/components/city/HubPage.vue).
 */
definePageMeta({
  middleware: ['redirect-city-hub-chain'],
})
</script>

<template>
  <CityHubPage />
</template>
