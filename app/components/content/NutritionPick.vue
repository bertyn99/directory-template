<script setup lang="ts">
withDefaults(defineProps<{
  product?: string
  partner?: string
  title?: string
}>(), {
  product: "creatine",
  partner: "",
  title: "",
});
</script>

<template>
  <AffiliateNutrition
    :product="product"
    :partner="partner"
    :title="title"
  />
</template>
