<template>
    <UContainer class="py-10 space-y-8">
        <UBreadcrumb :links="links" />

        <section class="border border-default bg-muted rounded-sm px-6 py-6 space-y-8">
            <div class="space-y-4">
                <div class="space-y-2">
                    <p class="text-xs tracking-[0.4em] uppercase text-muted">{{ $t('blog.badge', 'Blog') }}</p>
                    <h1 class="text-4xl text-default leading-tight">{{ $t('blog.title') }}</h1>
                    <p class="text-toned text-base">{{ $t('blog.subTitle') }}</p>
                </div>
            </div>
        </section>

        <!-- Featured Section -->
        <section v-if="featurePost && featurePost.length > 0" class="space-y-6">
            <h2 class="text-2xl text-default">{{ $t('blog.featured') }}</h2>
            <BlogFeatured :posts="featurePost" />
        </section>

        <!-- All Posts Grid -->
        <section v-if="lastPost && lastPost.length > 0" class="space-y-6">
            <h2 class="text-2xl text-default">{{ $t('blog.allArticles') }}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <BlogCard v-for="post in lastPost" :key="post.id || post.path" :post="post" />
            </div>
        </section>
        <div v-else class="border border-default bg-muted rounded-sm px-6 py-12 text-center">
            <p class="text-toned">{{ $t('blog.noPost') }}</p>
        </div>
    </UContainer>
</template>

<script setup lang="ts">
import type { Collections } from '@nuxt/content';

const links = useBreadcrumbItems()
const localePath = useLocalePath()
const { locale, t } = useI18n()
// All locales now have dedicated blog collections.
const supportedBlogLocales = ['fr', 'en', 'de', 'es', 'it', 'pt']
const collection = computed(() => ('blog_' + (supportedBlogLocales.includes(locale.value) ? locale.value : 'en')) as keyof Collections)
const { data: lastPost } = await useAsyncData(`blog-list-${locale.value}`, () =>
  queryCollection(collection.value)
    .select('id', 'path', 'title', 'description', 'image', 'category', 'author')
    .order('createdAt', 'DESC')
    .all()
)
const { data: featurePost } = await useAsyncData(`blog-featured-${locale.value}`, () =>
  queryCollection(collection.value)
    .select('id', 'path', 'title', 'description', 'image', 'category', 'author')
    .order('createdAt', 'DESC')
    .limit(3)
    .all()
)


defineOgImage('NuxtSeo', {

})
useHead({
    title: t('blog.title'),
    meta: [
        { name: 'description', content: t('blog.subTitle') }
    ]
})


useSchemaOrg([
  defineWebPage({
    '@type': 'CollectionPage',
    name: t('blog.title'),
    description: t('blog.subTitle'),
  }),
])
</script>