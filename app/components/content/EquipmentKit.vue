<script setup lang="ts">
withDefaults(defineProps<{
  sport?: string
  title?: string
  partner?: string
  items?: string | string[]
  bare?: boolean
}>(), {
  sport: "",
  title: "",
  partner: "",
  items: undefined,
  bare: false,
});
</script>

<template>
  <AffiliateKit
    :sport="sport"
    :title="title"
    :partner="partner"
    :items="items"
    :bare="bare"
  />
</template>
