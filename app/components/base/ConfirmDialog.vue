<script lang="ts" setup>
interface ConfirmDialogProps {
  title?: string
  description?: string
}

defineProps<ConfirmDialogProps>()

const emit = defineEmits<{
  close: [value: boolean]
}>()
</script>

<template>
  <UModal
    :title="title"
    :description="description"
    :dismissible="false"
    :ui="{ footer: 'justify-end', content: 'rounded-sm' }"
  >
    <template #footer>
      <UButton :label="$t('dashboard.venue.cancel')" color="neutral" variant="outline" :ui="{ rounded: 'rounded-sm' }" @click="emit('close', false)" />
      <UButton :label="$t('dashboard.venue.delete')" color="error" :ui="{ rounded: 'rounded-sm' }" @click="emit('close', true)" />
    </template>
  </UModal>
</template>
