<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const props = defineProps<{
    item: NavigationMenuItem
    close?: () => void
}>()

const localePath = useLocalePath()

const menuChildren = computed(() => props.item.children ?? [])
</script>

<template>
    <div
        data-categories-mega-menu
        class="w-[30rem] max-w-[calc(100vw-2rem)]"
    >
        <div class="flex gap-2 p-4">
            <div class="min-h-0 w-[11.5rem] shrink-0">
                <NuxtLink
                    :to="localePath('/categories')"
                    class="group relative flex size-full min-h-48 flex-col justify-end overflow-hidden rounded-sm border border-default bg-muted p-4 transition-colors hover:border-primary"
                    @click="close?.()"
                >
                    <div
                        class="absolute inset-0 bg-gradient-to-t from-primary/30 via-primary/5 to-transparent"
                    />
                    <div class="relative">
                        <UIcon
                            name="i-heroicons-squares-2x2"
                            class="mb-3 size-8 text-primary"
                        />
                        <p
                            class="font-display text-sm font-bold uppercase leading-tight text-highlighted"
                        >
                            {{ $t('nav.allStyles') }}
                        </p>
                        <p class="mt-1.5 text-xs leading-snug text-muted">
                            {{ $t('nav.allStylesDesc') }}
                        </p>
                        <span
                            class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary"
                        >
                            {{ $t('nav.explore') }}
                            <UIcon
                                name="i-heroicons-arrow-right"
                                class="size-3.5 transition-transform group-hover:translate-x-0.5"
                            />
                        </span>
                    </div>
                </NuxtLink>
            </div>

            <ul class="flex min-w-[14rem] flex-1 flex-col gap-0.5">
                <li v-for="child in menuChildren" :key="child.label">
                    <ULink
                        :to="child.to"
                        class="block rounded-sm border border-transparent p-3 text-left text-sm transition-colors hover:border-primary hover:bg-elevated/50"
                        @click="close?.()"
                    >
                        <p class="font-medium text-highlighted whitespace-nowrap">
                            {{ child.label }}
                        </p>
                        <p class="text-xs text-muted line-clamp-2">
                            {{ child.description }}
                        </p>
                    </ULink>
                </li>
            </ul>
        </div>
    </div>
</template>
