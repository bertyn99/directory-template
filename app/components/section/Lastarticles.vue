<template>
    <div class=" py-24 sm:py-32">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
            <div class="mx-auto max-w-2xl text-center">
                <h2 class="text-balance text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">{{
                    $t('blog.featured') }}
                </h2>
                <p class="mt-2 text-lg leading-8 text-gray-600">
                   {{ $t('blog.featuredSubtitle')}}
                </p>
            </div>
            <div
                class="mx-auto mt-16 grid max-w-2xl auto-rows-fr grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
                <article
v-for="post in lastPost" :key="post.id"
                    class="relative isolate flex flex-col justify-end overflow-hidden rounded-sm bg-gray-900 px-8 pb-8 pt-80 sm:pt-48 lg:pt-80">
                    <NuxtImg :src="post.image?.src" alt="" format="webp" quality="80" loading="lazy" width="640" class="absolute inset-0 -z-10 h-full w-full object-cover" />
                    <div class="absolute inset-0 -z-10 bg-gradient-to-t from-neutral-900 via-gray-900/40" />

                    <div class="flex flex-wrap items-center gap-y-1 overflow-hidden text-sm leading-6 text-gray-200">
                        <time :datetime="post.createdAt" class="mr-8">{{ formattedDate(post.createdAt) }}</time>
                        <div class="-ml-4 flex items-center gap-x-4">
                            <svg viewBox="0 0 2 2" class="-ml-0.5 h-0.5 w-0.5 flex-none fill-white/50">
                                <circle cx="1" cy="1" r="1" />
                            </svg>
                            <div class="flex gap-x-2.5">
                                <NuxtImg
:src="post.author?.avatar?.src ?? './img/author.jpg'" alt="" width="24" height="24" format="webp" quality="80"
                                    class="h-6 w-6 flex-none rounded-full bg-white/10" />
                                {{ post.author?.name }}
                            </div>
                        </div>
                    </div>
                    <h3 class="mt-3 text-lg font-semibold leading-6 text-white">
                        <NuxtLink :to="localePath(post.path)">
                            <span class="absolute inset-0" />
                            {{ post.title }}
                        </NuxtLink>
                    </h3>
                </article>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { BlogPost } from '~/types';
import type { Collections } from '@nuxt/content';

const { locale, t } = useI18n()
const collection = computed(() => ('blog_' + locale.value) as keyof Collections)
const { data: lastPost } = await useAsyncData(`home-articles-${locale.value}`, () =>
  queryCollection(collection.value).select('id', 'path', 'title', 'image', 'author', 'createdAt').order('createdAt', 'DESC').limit(3).all()
)

const localePath = useLocalePath()
const formattedDate = (date: string | undefined) => {
    if (!date) return ''
    const d = new Date(date)
    if (isNaN(d.getTime())) return date
    return new Intl.DateTimeFormat(locale.value, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(d)
}
</script>