<template>

    <UModal
v-model="isOpen" :ui="{

        width: ' sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl',

    }">
        <div class="p-4">

            <div class="flex mb-6">
                <div class="flex-1">
                    <h1 class="text-2xl font-semibold">{{ title }}</h1>
                    <p class="text-gray-500">{{ subtitle }}</p>
                </div>
                <div>
                    <UButton size="sm" icon="i-heroicons-x-mark" trailing variant="soft" aria-label="Close" @click="isOpen = !isOpen" />
                </div>
            </div>

            <slot />
        </div>
    </UModal>
</template>

<script setup>

const { title, subtitle } = defineProps(['title', 'subtitle'])
const isOpen = defineModel();


</script>