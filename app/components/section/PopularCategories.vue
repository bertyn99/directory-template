<template>
    <section class="py-16">
        <div class="container mx-auto">
            <h2 class="text-3xl font-bold text-center text-primary mb-12">{{ t('home.popularCategories') }}</h2>

            <div v-if="status === 'pending'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                <USkeleton v-for="i in 6" :key="i" class="h-96 w-full rounded-sm" />
            </div>

            <div v-else-if="featuredCategories.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                <CategoriesCard v-for="category in featuredCategories" :key="category.slug" :category="category" />
            </div>

            <div v-if="featuredCategories.length > 0" class="text-center mt-10">
                <UButton
                    :to="localePath('/categories')"
                    variant="outline"
                    color="primary"
                    size="lg"
                    class="rounded-sm font-semibold"
                    trailing
                    icon="i-heroicons-arrow-right-20-solid"
                >
                    {{ t('home.viewAllCategories') }}
                </UButton>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()

const { data, status } = await useLazyFetch<{ data: { id: number, name: string, slug: string, slugs: Record<string, string> | null }[] }>('/api/categories', {
    key: () => `popular-categories-${locale.value}`,
    query: { locale },
    watch: [locale],
})

const featuredCategories = computed(() => data.value?.data.slice(0, 6) ?? [])
</script>
