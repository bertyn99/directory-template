<template>
    <UContainer class="z-0 py-6">
        <UBreadcrumb :items="breadcrumbLinks" class="mb-6" />

        <section class="mb-12">
            <div class="mb-3 h-1 w-10 bg-primary" aria-hidden="true" />
            <h1 class="font-display text-4xl font-black uppercase leading-[1.05] tracking-tight text-default md:text-6xl">
                {{ t('categories.hub.heading', { category: categoryData!.name }) }}
            </h1>
            <p class="mt-5 max-w-3xl text-lg leading-relaxed text-default">
                {{ answerBox }}
            </p>
            <div class="mt-6 flex flex-wrap gap-3">
                <UButton
                    :to="venuesIndexPath"
                    color="primary"
                    variant="solid"
                    class="rounded-sm font-display font-bold uppercase tracking-wide"
                    icon="i-heroicons-magnifying-glass"
                    :label="t('guide.venueCta', { category: categoryData!.name })"
                />
                <UButton
                    v-if="hasGuide"
                    :to="guidePath"
                    color="neutral"
                    variant="outline"
                    class="rounded-sm font-display font-bold uppercase tracking-wide"
                    :label="t('categories.hub.readGuide', { category: categoryData!.name })"
                />
            </div>
        </section>

        <section v-if="categoryData?.image" class="mb-12">
            <NuxtImg
                :src="'/' + categoryData.image"
                :alt="categoryData.name"
                loading="eager"
                fetchpriority="high"
                :preload="{ fetchPriority: 'high' }"
                format="webp" quality="80" width="1280"
                class="w-full aspect-video object-cover rounded-sm border border-default"
            />
        </section>

        <section v-if="hasHubCopy" class="mb-14 max-w-3xl">
            <h2 class="font-display mb-4 flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-default">
                <span class="h-1 w-6 shrink-0 bg-primary" aria-hidden="true" />
                {{ t('categories.hub.whatTitle', { category: categoryData!.name }) }}
            </h2>
            <div v-if="hubEntry" class="prose dark:prose-invert max-w-none text-default">
                <Suspense>
                    <MarkdownDocument v-if="contentTree(hubEntry.body)" :value="contentTree(hubEntry.body)" :components="contentComponents" />
                </Suspense>
            </div>
            <p v-if="hasGuide" class="mt-4">
                <NuxtLink
                    :to="guidePath"
                    class="font-semibold text-primary transition-colors duration-150 hover:text-primary/80"
                >
                    {{ t('categories.hub.readGuide', { category: categoryData!.name }) }}
                </NuxtLink>
            </p>
        </section>

        <!-- Ad (in-article fluid) — first-party proxied AdSense, renders nothing until configured -->
        <LazyAdsAdUnit placement="categoryDetail" variant="inline" hydrate-on-idle class="mb-14" />

        <section v-if="siloEntries.length" class="mb-14">
            <h2 class="font-display mb-6 flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-default">
                <span class="h-1 w-6 shrink-0 bg-primary" aria-hidden="true" />
                {{ t('categories.hub.guidesTitle') }}
            </h2>
            <SiloLinks :category="canonicalSlug" />
        </section>

        <section v-if="topCities.length" class="mb-14">
            <h2 class="font-display mb-6 flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-default">
                <span class="h-1 w-6 shrink-0 bg-primary" aria-hidden="true" />
                {{ t('categories.hub.whereTitle', { category: categoryData!.name }) }}
            </h2>
            <CityLinks :category="canonicalSlug" :limit="8" />
        </section>

        <section v-if="featuredVenues.length" class="mb-14">
            <h2 class="font-display mb-6 flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-default">
                <span class="h-1 w-6 shrink-0 bg-primary" aria-hidden="true" />
                {{ t('categories.hub.featuredTitle') }}
            </h2>
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <VenueCard
                    v-for="(venue, i) in featuredVenues"
                    :key="venue.id"
                    :venue="venue"
                    :rank="i + 1"
                />
            </div>
        </section>

        <section v-if="faqItems.length" class="mb-14 border-t border-default bg-muted py-10">
            <h2 class="font-display mb-6 text-2xl font-black uppercase tracking-tight text-default">
                {{ t('categories.hub.faqTitle') }}
            </h2>
            <UAccordion
                :items="faqItems"
                :ui="{
                    item: 'border-b border-default last:border-b-0',
                    trigger: 'rounded-sm py-5 font-display text-base font-bold uppercase tracking-wide text-default hover:text-primary transition-colors duration-150',
                    body: 'max-w-3xl pb-5 text-base leading-relaxed text-default',
                    trailingIcon: 'size-5 text-primary',
                    label: 'text-start',
                }"
            >
                <template #leading="{ index }">
                    <span class="w-8 shrink-0 font-display text-sm font-bold text-primary">
                        {{ String(index + 1).padStart(2, '0') }}
                    </span>
                </template>
            </UAccordion>
        </section>

        <section v-if="similarCategories.length" class="mb-8">
            <h2 class="font-display mb-6 flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-default">
                <span class="h-1 w-6 shrink-0 bg-primary" aria-hidden="true" />
                {{ t('categories.cities.similar') }}
            </h2>
            <div class="grid gap-6 md:grid-cols-3">
                <CategoriesCard
                    v-for="category in similarCategories"
                    :key="category.id"
                    :category="category"
                    class="rounded-sm border border-default hover:border-primary transition-colors duration-150"
                />
            </div>
        </section>
    </UContainer>
</template>

<script setup lang="ts">
import type { Collections } from '@nuxt/content'
import type { Activity } from '~~/server/types'
import {
  findActivityDefinitionForRow,
  getActivityLocaleSlug,
  siblingCategorySlugs,
} from '~~/shared/activities'
import { resolveContentLocale, categoryGuidesCollectionName } from '~~/shared/silo'
import SiloLinks from '~~/app/components/content/SiloLinks.vue'
import CityLinks from '~~/app/components/content/CityLinks.vue'

interface HubFaq {
  q: string
  a: string
}

interface HubEntry {
  title?: string
  description?: string
  faq?: HubFaq[]
}

interface SiloLinkEntry {
  type: string
}

interface FeaturedVenue {
  id: number
  name: string
  slug: string
}

interface ListedCategory {
  id: number
  name: string
  slug: string
  slugs?: Record<string, string> | null
}

interface CityCard {
  name: string
  venueCount: number
}

const route = useRoute()

await useCategoryRouteI18n()

const { locale, t } = useI18n()
const localePath = useLocalePath()
const categorySlug = computed(() => String(route.params.category ?? ''))

const activeLocale = resolveContentLocale(locale.value)
const collection = categoryGuidesCollectionName(activeLocale) as keyof Collections

const { data: categoryData, error } = await useAsyncData(`category-${categorySlug.value}`, async () => {
    const resp = await $fetch<{ category: Activity }>('/api/categories/' + categorySlug.value, {
        query: { locale: locale.value },
    })
    return resp.category
})

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode || 500,
    statusMessage: error.value.statusMessage || 'Failed to load category',
  })
}

if (!categoryData.value) {
  throw createError({ statusCode: 404, statusMessage: 'Category not found' })
}

const canonicalSlug = computed(() => {
    return findActivityDefinitionForRow(categoryData.value!)?.slug ?? categoryData.value!.slug
})

const categoryLocaleSlug = computed(() =>
    getActivityLocaleSlug(canonicalSlug.value, locale.value) ?? categorySlug.value,
)

const venuesIndexPath = computed(() =>
    localePath(`/venues?activities=${canonicalSlug.value}`),
)
const guidePath = computed(() =>
    localePath(`/categories/${categoryLocaleSlug.value}/guide`),
)

const { data: hubEntry } = await useAsyncData(
    `category-hub-${activeLocale}-${canonicalSlug.value}`,
    () => queryCollection(collection)
        .where('style', '=', canonicalSlug.value)
        .where('type', '=', 'hub')
        .first(),
)

const { data: siloRows } = await useAsyncData(
    `category-silo-${activeLocale}-${canonicalSlug.value}`,
    () => queryCollection(collection)
        .where('style', '=', canonicalSlug.value)
        .where('type', '<>', 'hub')
        .select('type')
        .all(),
)

const siloEntries = computed<SiloLinkEntry[]>(() => (siloRows.value ?? []) as SiloLinkEntry[])
const hasGuide = computed(() => siloEntries.value.some(entry => entry.type === 'guide'))
const hasHubCopy = computed(() => Boolean(hubEntry.value))

const { data: citiesWithCategory } = await useAsyncData(
    `cities-with-category-${canonicalSlug.value}`,
    () => $fetch<{ data: { eu: CityCard[], country: { cities: CityCard[] } | null } }>(`/api/categories/${canonicalSlug.value}/cities`),
    {
        transform: (resp) => resp.data ? [...resp.data.eu, ...(resp.data.country?.cities ?? [])] : [],
    },
)

const topCities = computed(() =>
    [...(citiesWithCategory.value ?? [])]
        .filter(city => city.venueCount > 0)
        .sort((a, b) => b.venueCount - a.venueCount)
        .slice(0, 8),
)
const citiesCount = computed(() => citiesWithCategory.value?.length ?? 0)

const { data: featuredVenuesData } = await useAsyncData(
    `featured-venues-${canonicalSlug.value}`,
    () => $fetch<{ data: FeaturedVenue[] }>('/api/venues', {
        query: { activities: canonicalSlug.value, limit: 4 },
    }),
)
const featuredVenues = computed(() => featuredVenuesData.value?.data ?? [])

const { data: allCategories } = await useAsyncData(
    'similar-categories',
    () => $fetch<{ data: ListedCategory[] }>('/api/categories/', { query: { locale: locale.value } }),
    { transform: resp => resp.data },
)

const similarCategories = computed(() => {
    const slugs = siblingCategorySlugs(canonicalSlug.value, 6)
    return (allCategories.value ?? []).filter(category => slugs.includes(category.slug)).slice(0, 3)
})

const hubTyped = computed(() => hubEntry.value as HubEntry | null)

const answerBox = computed(() => {
    const fromHub = hubTyped.value?.description?.trim()
    if (fromHub) return fromHub
    return t('categories.hub.answerBox', {
        category: categoryData.value?.name,
        count: citiesCount.value,
    })
})

const faqItems = computed(() => {
    const fromHub = hubTyped.value?.faq
    if (fromHub?.length) {
        return fromHub.map((item, index) => ({
            label: item.q,
            content: item.a,
            value: `hub-${index}`,
        }))
    }
    const vars = { category: categoryData.value?.name ?? '' }
    return [
        { label: t('categories.hub.faq.where.q', vars), content: t('categories.hub.faq.where.a', vars), value: 'where' },
        { label: t('categories.hub.faq.price.q', vars), content: t('categories.hub.faq.price.a', vars), value: 'price' },
        { label: t('categories.hub.faq.kids.q', vars), content: t('categories.hub.faq.kids.a', vars), value: 'kids' },
        { label: t('categories.hub.faq.trial.q', vars), content: t('categories.hub.faq.trial.a', vars), value: 'trial' },
        { label: t('categories.hub.faq.licence.q', vars), content: t('categories.hub.faq.licence.a', vars), value: 'licence' },
    ]
})

const breadcrumbLinks = useBreadcrumbItems({
    overrides: [
        undefined,
        undefined,
        {
            label: categoryData.value?.name ?? 'Category Details',
            to: localePath(`/categories/${categoryLocaleSlug.value}`),
        },
    ],
})

const pageTitle = computed(() =>
    t('categories.hub.seoTitle', { category: categoryData.value?.name }),
)
const pageDescription = computed(() =>
    t('categories.hub.seoDescription', { category: categoryData.value?.name, count: citiesCount.value }),
)
const pageKeywords = computed(() =>
    t('categories.hub.seoKeywords', { category: categoryData.value?.name }),
)

useSeoMeta({
    title: pageTitle,
    description: pageDescription,
    keywords: pageKeywords,
    ogTitle: pageTitle,
    ogDescription: pageDescription,
    ogType: 'website',
    twitterCard: 'summary_large_image',
})

defineOgImage('NuxtSeo', {
    title: computed(() => categoryData.value?.name ?? 'Venues'),
    description: pageDescription,
    theme: '#1E293B',
})

useSchemaOrg([
    defineBreadcrumb({
        itemListElement: breadcrumbLinks,
    }),
    defineWebPage({
        '@type': ['WebPage', 'CollectionPage', 'FAQPage'],
        name: pageTitle,
        description: pageDescription,
    }),
    ...faqItems.value.map(item => defineQuestion({
        name: item.label,
        acceptedAnswer: item.content,
    })),
])
</script>
