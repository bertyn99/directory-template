<script setup lang="ts">
interface GlossaryTerm {
  term: string
  def: string
}

const props = defineProps<{
  title?: string
  terms?: GlossaryTerm[]
}>()

const items = computed(() => props.terms ?? [])
</script>

<template>
  <section v-if="items.length" class="not-prose my-8 rounded-sm border border-default bg-muted p-6">
    <p
      v-if="title"
      class="mb-4 font-display text-lg font-black uppercase tracking-tight text-default"
    >
      {{ title }}
    </p>
    <dl class="space-y-4">
      <div v-for="item in items" :key="item.term">
        <dt class="font-display text-sm font-bold uppercase tracking-wide text-primary">
          {{ item.term }}
        </dt>
        <dd class="mt-1 text-sm leading-relaxed text-default">
          {{ item.def }}
        </dd>
      </div>
    </dl>
  </section>
</template>
