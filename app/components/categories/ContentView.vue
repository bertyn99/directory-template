<script setup lang="ts">
import type { ContentTocLink } from '@nuxt/ui'
import type { Collections } from '@nuxt/content'
import { findActivityDefinition, getActivityDisplayName, getActivityLocaleSlug } from '~~/shared/activities'
import {
  isSiloSpokeType,
  resolveContentLocale,
  siloTypeLabelKey,
  sortSiloEntries,
  categoryGuidesCollectionName,
  type SiloSpokeType,
} from '~~/shared/silo'
import SiloLinks from '~~/app/components/content/SiloLinks.vue'

const props = defineProps<{
  type: SiloSpokeType
  /** Directory mode renders the venue-index guide (/venues/guide), not a category silo page. */
  directory?: boolean
}>()

const route = useRoute()
const { locale, t } = useI18n()
const localePath = useLocalePath()

const activeLocale = resolveContentLocale(locale.value)
const collection = categoryGuidesCollectionName(activeLocale) as keyof Collections

const categoryParam = computed(() => route.params.category as string ?? '')
const definition = computed(() => (props.directory ? null : findActivityDefinition(categoryParam.value)))

if (!props.directory && !definition.value) {
  throw createError({ statusCode: 404, statusMessage: 'Category not found' })
}

const canonicalSlug = computed(() => definition.value?.slug ?? '_directory')

const { data: entry, error } = await useAsyncData(
  `category-guides-${activeLocale}-${canonicalSlug.value}-${props.type}`,
  () => {
    return queryCollection(collection)
      .where('style', '=', canonicalSlug.value)
      .where('type', '=', props.type)
      .first()
  },
)

if (error.value || !entry.value) {
  throw createError({ statusCode: 404, statusMessage: 'Guide not found' })
}

const categoryName = computed(() =>
  props.directory
    ? t('guide.directoryStyleName')
    : getActivityDisplayName(canonicalSlug.value, activeLocale),
)
const hubPath = computed(() => {
  if (props.directory) return localePath('/venues')
  return localePath(`/categories/${getActivityLocaleSlug(canonicalSlug.value, activeLocale) ?? canonicalSlug.value}`)
})
const venueCtaPath = computed(() => {
  if (props.directory) return localePath('/venues')
  return localePath(`/venues?activities=${canonicalSlug.value}`)
})
const venueCtaLabel = computed(() =>
  props.directory
    ? t('guide.venueCtaDirectory')
    : t('guide.venueCta', { category: categoryName.value }),
)

const tocLinks = computed<ContentTocLink[]>(() => {
  const toc = (entry.value as { body?: { toc?: { links?: ContentTocLink[] } } } | null)?.body?.toc
  return toc?.links ?? []
})

interface SiblingEntry {
  title: string
  type: string
}

const { data: siblingRows } = await useAsyncData(
  `category-guide-siblings-${activeLocale}-${canonicalSlug.value}-${props.type}`,
  async () => {
    if (props.directory) return []
    const rows = await queryCollection(collection)
      .where('style', '=', canonicalSlug.value)
      .where('type', '<>', 'hub')
      .select('title', 'type')
      .all()
    const filtered = (rows as SiblingEntry[]).filter(row => row.type !== props.type && isSiloSpokeType(row.type))
    return sortSiloEntries(filtered).slice(0, 2)
  },
)

const siblingLinks = computed(() => {
  const localeSlug = getActivityLocaleSlug(canonicalSlug.value, activeLocale) ?? canonicalSlug.value
  return (siblingRows.value ?? []).map(row => ({
    title: row.title,
    type: row.type,
    to: localePath(`/categories/${localeSlug}/${row.type}`),
    label: isSiloSpokeType(row.type) ? t(siloTypeLabelKey(row.type), row.type) : row.type,
  }))
})

const faqItems = computed(() =>
  (entry.value?.faq ?? []).map((item, index) => ({
    label: item.q,
    content: item.a,
    value: `faq-${index}`,
  })),
)

const links = useBreadcrumbItems({
  overrides: props.directory
    ? [
        undefined,
        { label: t('nav.venues'), to: localePath('/venues') },
        { label: entry.value?.title ?? '' },
      ]
    : [
        undefined,
        { label: t('nav.categories.list'), to: localePath('/categories') },
        { label: categoryName.value, to: hubPath.value },
        { label: entry.value?.title ?? '' },
      ],
})

useHead({
  title: entry.value?.title,
  meta: [{ name: 'description', content: entry.value?.description }],
})

useSchemaOrg([
  defineBreadcrumb({
    itemListElement: links.value,
  }),
  defineArticle({
    image: entry.value?.image?.src,
    datePublished: entry.value?.createdAt,
    dateModified: entry.value?.updatedAt,
  }),
  ...(entry.value?.faq?.length
    ? [
        defineWebPage({
          '@type': ['WebPage', 'FAQPage'],
          name: entry.value.title,
          description: entry.value.description,
        }),
        ...entry.value.faq.map(item => defineQuestion({
          name: item.q,
          acceptedAnswer: item.a,
        })),
      ]
    : []),
])
</script>

<template>
    <UContainer v-if="entry" class="py-6 lg:py-10">
        <UBreadcrumb :items="links" class="mb-8" />

        <header class="mb-8 grid items-start gap-8 lg:mb-12 lg:grid-cols-12 lg:gap-12">
            <div class="lg:col-span-7">
                <div class="mb-4 h-1 w-10 bg-primary" aria-hidden="true" />
                <p class="mb-3 font-display text-xs font-bold uppercase tracking-wide text-primary">
                    {{ categoryName }}
                </p>
                <h1 class="text-3xl leading-[1.1] sm:text-4xl lg:text-5xl">
                    {{ entry.title }}
                </h1>
                <p
                    v-if="entry.description"
                    class="mt-5 max-w-[65ch] text-lg leading-relaxed text-toned"
                >
                    {{ entry.description }}
                </p>
                <div class="mt-6 flex flex-wrap gap-3">
                    <UButton
                        :to="venueCtaPath"
                        color="primary"
                        variant="solid"
                        class="rounded-sm font-display font-bold uppercase tracking-wide"
                        :label="venueCtaLabel"
                        icon="i-heroicons-magnifying-glass"
                    />
                    <UButton
                        :to="hubPath"
                        color="neutral"
                        variant="outline"
                        class="rounded-sm font-display font-bold uppercase tracking-wide"
                        :label="t('guide.backToHub', { category: categoryName })"
                        icon="i-heroicons-arrow-left"
                    />
                </div>
            </div>

            <div v-if="entry.image?.src" class="lg:col-span-5">
                <NuxtImg
                    :src="entry.image.src"
                    :alt="entry.title"
                    sizes="sm:100vw lg:480px"
                    format="webp"
                    loading="eager"
                    fetchpriority="high"
                    class="aspect-[4/3] w-full max-h-[22rem] rounded-sm border border-default object-cover"
                />
            </div>
        </header>

        <SiloLinks
            v-if="!directory"
            class="mb-8 lg:mb-10"
            layout="rail"
            :category="canonicalSlug"
            :exclude="type"
        />

        <UPage :ui="{ root: 'lg:gap-12', center: 'lg:col-span-7 min-w-0', right: 'lg:col-span-3 min-w-0' }">
            <article class="prose prose-primary dark:prose-invert max-w-none w-full prose-headings:scroll-mt-24 prose-img:rounded-sm prose-img:border prose-img:border-default">
                <Suspense>
                    <MarkdownDocument v-if="contentTree(entry.body)" :value="contentTree(entry.body)" :components="contentComponents" />
                </Suspense>
            </article>

            <section v-if="faqItems.length" class="not-prose mt-12 border-t border-default bg-muted px-4 py-8 sm:px-6">
                <h2 class="font-display mb-6 text-2xl font-black uppercase tracking-tight text-default">
                    {{ t('guide.faqTitle') }}
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
                />
            </section>

            <nav
                v-if="siblingLinks.length"
                class="not-prose mt-10 grid gap-4 border-t border-default pt-8 sm:grid-cols-2"
                :aria-label="t('guide.siblings')"
            >
                <NuxtLink
                    v-for="sibling in siblingLinks"
                    :key="sibling.type"
                    :to="sibling.to"
                    class="rounded-sm border border-default p-4 transition-colors duration-150 hover:border-primary"
                >
                    <span class="block font-display text-xs font-bold uppercase tracking-wide text-primary">
                        {{ sibling.label }}
                    </span>
                    <span class="mt-1 block text-sm font-medium text-default">
                        {{ sibling.title }}
                    </span>
                </NuxtLink>
            </nav>

            <div class="mt-12 flex flex-col items-start justify-between gap-4 border-t border-default pt-8 sm:flex-row sm:items-center">
                <p class="font-display text-lg font-bold uppercase tracking-wide text-default">
                    {{ venueCtaLabel }}
                </p>
                <UButton
                    :to="venueCtaPath"
                    color="primary"
                    variant="solid"
                    class="rounded-sm font-display font-bold uppercase tracking-wide"
                    :label="t('guide.browseVenues')"
                    icon="i-heroicons-magnifying-glass"
                    trailing
                />
            </div>

            <template v-if="tocLinks.length" #right>
                <UContentToc
                    highlight
                    color="primary"
                    highlight-color="primary"
                    highlight-variant="circuit"
                    :title="t('guide.toc')"
                    :links="tocLinks"
                    :ui="{
                        root: 'bg-default/90 lg:bg-transparent backdrop-blur-sm lg:backdrop-blur-none',
                        container: 'lg:py-0 border-b border-default lg:border-0',
                        title: 'font-display text-xs font-bold uppercase tracking-wide',
                        trigger: 'rounded-sm',
                        link: 'rounded-sm',
                        linkText: 'whitespace-normal text-pretty',
                    }"
                />
            </template>
        </UPage>
    </UContainer>
</template>
