<script setup lang="ts">
import { isSiloSpokeType } from '~~/shared/silo'

/**
 * Single dispatch route for /categories/<category>/<subtopic>.
 * Silo spoke slugs (directoryConfig.content.siloSpokes — formerly six static
 * sibling page files) render the guide view; anything else is a category ×
 * city page. Both surfaces manage their own SEO (head + schema.org).
 *
 * In the 'country-city-category' pattern the non-spoke case is LEGACY here:
 * the redirect-category-city-chain middleware resolves the city's country
 * server-side and 301s to the chain URL. Spokes keep the /categories URL in
 * both patterns.
 */
definePageMeta({
  middleware: ['redirect-category-city-chain'],
})

const route = useRoute()
const spokeType = computed(() => {
  const slug = route.params.cities as string
  return isSiloSpokeType(slug) ? slug : undefined
})
</script>

<template>
  <CategoriesContentView v-if="spokeType" :type="spokeType" />
  <CategoriesCityPage v-else />
</template>
