<template>
    <UContainer v-if="article" class="py-10 space-y-8">
        <UBreadcrumb :links="links" />

        <!-- Hero Image -->
        <div class="w-full rounded-sm overflow-hidden border border-default bg-muted">
            <NuxtImg
:src="article.image?.src" :alt="article.title" sizes="sm:100vw md:70vw lg:1200px"
                format="webp" loading="eager" fetchpriority="high" class="w-full h-[40vh] sm:h-[50vh] md:h-[60vh] object-cover" />
        </div>

        <!-- Article Header -->
        <div class="space-y-4 max-w-4xl mx-auto">
            <div class="space-y-2">
                <UBadge
v-if="article.category" color="primary" variant="soft"
                    class="rounded-sm border border-primary/30 text-xs font-medium uppercase tracking-wide">
                    {{ article.category }}
                </UBadge>
                <h1 class="text-3xl sm:text-4xl md:text-5xl text-default leading-tight">
                    {{ article.title }}
                </h1>
                <div v-if="article.description" class="text-lg text-toned">
                    {{ article.description }}
                </div>
                <div v-if="article.date || article.author" class="flex items-center gap-4 text-sm text-muted">
                    <time v-if="article.createdAt" :datetime="article.createdAt">{{ formattedDate }}</time>
                    <span v-if="article.author?.name" class="flex items-center gap-2">
                        <span>{{ article.author.name }}</span>
                    </span>
                </div>
            </div>
        </div>

        <!-- Article Content -->
        <article class="prose prose-primary dark:prose-invert max-w-4xl mx-auto w-full">
            <div class="border border-default bg-default rounded-sm p-6 md:p-8">
                <Suspense>
                    <MarkdownDocument v-if="comarkTree" :value="comarkTree" :components="contentComponents" />
                </Suspense>
            </div>
        </article>

    </UContainer>
</template>

<script setup lang="ts">
import type { BlogPost } from '~/types';
import type { Collections } from '@nuxt/content';
import { contentTree, contentComponents } from '~/composables/content-markdown'


const route = useRoute()
const slug = computed(() => route.params.slug)
const localePath = useLocalePath()
const { locale } = useI18n()
// All locales now have dedicated blog collections.
const supportedBlogLocales = ['fr', 'en', 'de', 'es', 'it', 'pt']
const collection = ('blog_' + (supportedBlogLocales.includes(locale.value) ? locale.value : 'en')) as keyof Collections
const { data: article, error } = await useAsyncData(`content-${locale.value}-${slug.value}`, () => {
    const path = `/blog/${slug.value}`
    return queryCollection(collection).path(path).first()
})

const a = article.value as { body?: { type?: string; value?: unknown[] } } | null

// Nuxt Content's minimark body adapted to a Comark tree for MarkdownDocument
const comarkTree = computed(() => contentTree(a?.body))



if (error.value || !article.value) {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' })
}

const links = useBreadcrumbItems({
    overrides: [
        undefined, // Home
        undefined, // Blog
        {
            label: article?.value?.title ?? 'Blog Post',
            to: '/blog/my-post',
        }
    ]
})

const formattedDate = computed(() => formatDate(article.value?.createdAt, { style: 'long', locale: locale.value }))

useHead({
    title: article.value.title,
    meta: [
        { name: 'description', content: article?.value.description }
    ]
})
useSchemaOrg([
    defineArticle({
        // BlogPosting: the recipe-recommended @type for blog posts (vs generic Article)
        '@type': 'BlogPosting',
        headline: article.value.title,
        description: article.value.description,
        image: article.value.image?.src,
        datePublished: article.value.createdAt,
        dateModified: article.value.updatedAt,
        // Google wants a named author; frontmatter author { name, description, avatar }
        ...(article.value.author?.name
            ? { author: { '@type': 'Person', name: article.value.author.name } }
            : {}),
    }),
])
</script>