<script setup lang="ts">
import {
  findActivityDefinitionForRow,
  getActivityDisplayNameForRow,
  getActivityLocaleSlug,
} from '~~/shared/activities'

const { category } = defineProps<{
    category: {
        id?: number
        name: string
        image?: string | null
        slug: string
        slugs?: Record<string, string> | null
        content?: Record<string, string | null> | null
    }
}>()

const { locale, t } = useI18n()
const localePath = useLocalePath()

const fallbackImage = '/img/venue-fallback.png'

const cardImage = computed(() => {
    if (!category.image) {
        return fallbackImage
    }

    return category.image.startsWith('/') ? category.image : `/${category.image}`
})

const localizedSummary = computed(() => {
    if (!category.content) {
        return t('categories.card.descriptionFallback')
    }

    return (
        category.content[locale.value] ||
        category.content.fr ||
        category.content.en ||
        Object.values(category.content)[0] ||
        t('categories.card.descriptionFallback')
    )
})

/**
 * Prefer catalog locale name (EN base + keyed alternatives).
 * Resolve by slug — never by numeric id (ids differ across envs).
 */
const localizedName = computed(() =>
    getActivityDisplayNameForRow(category, locale.value),
)

const localizedSlug = computed(() => {
    const def = findActivityDefinitionForRow(category)
    if (def) {
        return getActivityLocaleSlug(def.slug, locale.value)
            || category.slugs?.[locale.value]
            || def.slug
    }
    return category.slugs?.[locale.value] || category.slug
})
</script>


<template>
    <UCard
class="relative h-96 overflow-hidden group cursor-pointer border border-default rounded-sm bg-default" :ui="{
        root: 'h-full',
        body: 'absolute inset-0 flex flex-col justify-end p-8',
    }">
        <NuxtImg
:src="cardImage" :alt="localizedName" loading="lazy" format="webp" quality="80" width="640"
            class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div
            class="absolute inset-0 bg-gradient-to-t from-black/85 via-primary/60 to-transparent opacity-95 transition-opacity duration-300 group-hover:opacity-80"/>
        <p
            class="absolute top-4 left-4 text-[11px] font-semibold uppercase tracking-[0.35em] text-white drop-shadow-sm">
            {{ t('categories.meta.badge') }}
        </p>

        <NuxtLink
:to="localePath(`/categories/${localizedSlug}`)"
            class="relative z-10 transform transition-transform duration-300 group-hover:translate-y-[-8px]">
            <h2 class="text-3xl font-bold mb-2 text-white tracking-wide">{{ localizedName }}</h2>
            <p class="text-white/80 text-sm leading-relaxed max-w-md line-clamp-2 mb-4">
                {{ localizedSummary }}
            </p>
            <div class="inline-flex">
                <UButton
color="primary" class="rounded-sm font-semibold tracking-wide px-4" trailing
                    icon="i-heroicons-arrow-small-right-solid" size="sm">
                    {{ $t('categories.cta', { category: localizedName }) }}
                </UButton>
            </div>
        </NuxtLink>
    </UCard>
</template>
