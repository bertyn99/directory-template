<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <aside class="not-prose my-8 rounded-sm border border-default bg-muted p-6">
    <p
      v-if="title"
      class="mb-4 font-display text-lg font-black uppercase tracking-tight text-default"
    >
      {{ title }}
    </p>
    <div class="space-y-3 text-sm leading-relaxed text-default [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:marker:text-primary">
      <slot />
    </div>
  </aside>
</template>
