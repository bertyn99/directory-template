<script setup lang="ts">
interface CompareRow {
  label: string
  values: string[]
}

const props = defineProps<{
  caption?: string
  columns?: string[] | string
  rows?: CompareRow[] | string
}>()

const parsedColumns = computed(() => {
  if (Array.isArray(props.columns)) return props.columns
  if (typeof props.columns === 'string' && props.columns.trim()) {
    return props.columns.split('|').map(part => part.trim()).filter(Boolean)
  }
  return []
})

const parsedRows = computed<CompareRow[]>(() => {
  if (Array.isArray(props.rows)) return props.rows
  return []
})
</script>

<template>
  <div class="not-prose my-8 overflow-x-auto rounded-sm border border-default">
    <table class="w-full min-w-[36rem] border-collapse text-left text-sm">
      <caption
        v-if="caption"
        class="border-b border-default bg-muted px-4 py-3 text-left font-display text-xs font-bold uppercase tracking-wide text-muted"
      >
        {{ caption }}
      </caption>
      <thead class="bg-muted">
        <tr>
          <th class="px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-default">
            {{ parsedColumns[0] ?? '' }}
          </th>
          <th
            v-for="(column, index) in parsedColumns.slice(1)"
            :key="index"
            class="px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-default"
          >
            {{ column }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, rowIndex) in parsedRows"
          :key="rowIndex"
          class="border-t border-default"
        >
          <th class="px-4 py-3 font-medium text-default">{{ row.label }}</th>
          <td
            v-for="(value, valueIndex) in row.values"
            :key="valueIndex"
            class="px-4 py-3 text-toned"
          >
            {{ value }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
