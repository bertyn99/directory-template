<script setup lang="ts">
/**
 * Category × city at the country-first chain URL
 * /{country}/{city}/{category} — canonical shape for the
 * 'country-city-category' pattern; in 'category-city' mode the named
 * middleware 301s to /categories/{category}/{city}. The page body is the
 * shared CategoriesCityPage component, which reads its slugs through the
 * chain-route params normalizer (shared/city-chain.ts).
 */
definePageMeta({
  middleware: ['redirect-category-city-chain'],
})
</script>

<template>
  <CategoriesCityPage />
</template>
