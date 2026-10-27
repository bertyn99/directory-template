<script setup lang="ts">
import { isSiloSpokeType } from '~~/shared/silo'

/**
 * Single dispatch route for /categories/<category>/<subtopic>.
 * Silo spoke slugs (directoryConfig.content.siloSpokes — formerly six static
 * sibling page files) render the guide view; anything else is a category ×
 * city page. Both surfaces manage their own SEO (head + schema.org).
 */
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
