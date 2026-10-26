// pages/categories.vue
<template>
    <UContainer class="py-10">
        <UBreadcrumb :links="breadcrumbLinks" />

        <section class="mt-10 space-y-6">
            <p class="text-xs font-semibold uppercase tracking-[0.4em] text-muted">{{ $t('categories.meta.badge') }}</p>
            <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div class="max-w-3xl space-y-4">
                    <h1 class="text-4xl md:text-5xl font-bold text-default">
                        {{ $t('categories.title') }}
                    </h1>
                    <p class="text-lg text-muted leading-relaxed">
                        {{ $t('categories.subTitle') }}
                    </p>
                </div>
                <div class="text-right">
                    <p class="text-sm uppercase tracking-[0.3em] text-muted">{{ $t('categories.meta.catalogTitle') }}</p>
                    <p class="text-4xl font-semibold text-default">{{ categoryCount }}</p>
                    <p class="text-sm text-toned">{{ $t('categories.meta.catalogHint') }}</p>
                </div>
            </div>

            <div class="prose max-w-3xl text-base leading-relaxed text-default">
                <p>{{ $t('categories.intro') }}</p>
            </div>

            <div class="flex flex-wrap gap-2">
                <NuxtLink
v-for="link in featuredCategoryLinks" :key="link.to" :to="link.to"
                    class="rounded-sm border border-default bg-muted px-3 py-1.5 text-sm font-medium text-default hover:border-primary transition-colors">
                    {{ link.label }}
                </NuxtLink>
            </div>

            <div class="grid gap-4 md:grid-cols-3">
                <UCard
v-for="tile in overviewTiles" :key="tile.title"
                    class="border border-default bg-muted rounded-sm hover:border-primary transition-colors" :ui="{
                        body: {
                            base: 'space-y-2 p-5',
                        },
                        ring: '',
                        shadow: '',
                    }">
                    <p class="text-xs uppercase tracking-[0.3em] text-muted">{{ tile.label }}</p>
                    <p class="text-xl font-semibold text-default">{{ tile.title }}</p>
                    <p class="text-sm text-toned">{{ tile.subtitle }}</p>
                </UCard>
            </div>
        </section>

        <section class="mt-12">
            <div class="flex items-center justify-between border-b border-default pb-4">
                <p class="text-xs uppercase tracking-[0.35em] text-muted">{{ $t('categories.meta.focusTitle') }}</p>
                <span class="text-sm font-medium text-toned">{{ $t('categories.meta.focus') }}</span>
            </div>
            <div class="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <template v-for="item in categoryGridItems" :key="item.kind === 'category' ? item.category.id : item.id">
                    <CategoriesCard v-if="item.kind === 'category'" :category="item.category" />
                    <AdsAdUnit v-else placement="categoriesHub" variant="card" />
                </template>
            </div>
        </section>
    </UContainer>
</template>

<script setup>
import { buildCategoryPath, findActivityDefinition, MOST_SEARCHED_CATEGORIES } from '~~/shared/activities'

const { t, locale } = useI18n()
const breadcrumbLinks = useBreadcrumbItems()

const NEW_HUB_SLUGS = ['tai-chi', 'sambo']
const featuredCategoryLinks = computed(() => {
    const categories = curatedCategories.value || []
    const slugs = [...MOST_SEARCHED_CATEGORIES, ...NEW_HUB_SLUGS]
    return slugs
        .map((slug) => {
            const target = findActivityDefinition(slug)?.slug ?? slug
            const match = categories.find((s) => (findActivityDefinition(s.slug)?.slug ?? s.slug) === target)
            if (!match) return null
            return { to: buildCategoryPath(locale.value, target), label: match.name || target }
        })
        .filter(Boolean)
})

    const { data: curatedCategories } = await useAsyncData(
    () => `categories-${locale.value}`,
    async () => $fetch('/api/categories', { query: { locale: locale.value } }),
    {
        watch: [locale],
        transform: (resp) => resp.data,
    },
)

const categoryCount = computed(() => curatedCategories.value?.length ?? 0)

// Category grid with ad cards interleaved: one after the 6th category card (end of
// the 2nd row on desktop) and one closing the grid. AdsAdUnit renders nothing
// while the AdSense slot is unconfigured, so the grid degrades to pure cards.
const categoryGridItems = computed(() => {
    const items = []
    for (const [i, category] of (curatedCategories.value ?? []).entries()) {
        if (i === 6) {
            items.push({ kind: 'ad', id: 'categories-hub-mid' })
        }
        items.push({ kind: 'category', category })
    }
    if ((curatedCategories.value?.length ?? 0) >= 3) {
        items.push({ kind: 'ad', id: 'categories-hub-end' })
    }
    return items
})

    useSeoMeta({
    title: t('categories.title'),
    description: () => t('categories.subTitle') + ' ' + t('categories.meta.catalogTitle') + ' — ' + categoryCount.value + ' ' + t('categories.meta.catalogHint'),
    ogTitle: t('categories.title'),
    ogDescription: () => t('categories.subTitle') + ' ' + t('categories.meta.catalogTitle') + ' — ' + categoryCount.value + ' ' + t('categories.meta.catalogHint'),
    ogType: 'website',
    ogLocale: () => locale.value.replace(/-/g, '_'),
    twitterCard: 'summary_large_image',
    })

        defineOgImage('NuxtSeo', {
    title: t('categories.title'),
    description: t('categories.subTitle'),
    theme: '#1E293B',
})

const overviewTiles = computed(() => ([
    {
        label: t('categories.meta.catalogTitle'),
        title: t('categories.meta.catalog', { count: categoryCount.value }),
        subtitle: t('categories.meta.catalogHint'),
    },
    {
        label: t('categories.meta.refreshTitle'),
        title: t('categories.meta.refresh'),
        subtitle: t('categories.meta.refreshHint'),
    },
    {
        label: t('categories.meta.focusTitle'),
        title: t('categories.meta.focus'),
        subtitle: t('categories.meta.focusHint'),
    },
]))


useSchemaOrg([
    defineBreadcrumb({
        itemListElement: breadcrumbLinks
    }),
    defineWebPage({
        name: t('categories.title'),
        description: t('categories.subTitle'),
    })
])


</script>