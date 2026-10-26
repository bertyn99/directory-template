<template>
    <div class="flex flex-col lg:flex-row gap-4">
        <!-- Main Featured Article -->
        <div
v-if="posts[0]"
            class="group basis-full lg:basis-2/3 relative min-h-[400px] lg:min-h-[500px] rounded-sm overflow-hidden border border-default bg-muted hover:border-primary transition-all duration-150">
            <NuxtImg
v-if="posts[0].image?.src" :src="posts[0].image.src" :alt="posts[0].title"
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="eager" fetchpriority="high" :preload="{ fetchPriority: 'high' }" format="webp" quality="80"
                width="960" height="640" fit="cover"
                sizes="sm:100vw lg:66vw" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end">
                <div class="w-full p-6 md:p-8 text-white">
                    <UBadge
v-if="posts[0].category" color="primary" variant="solid"
                        class="rounded-sm border border-primary/20 text-xs font-semibold mb-4">
                        {{ posts[0].category }}
                    </UBadge>
                    <h2 class="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-4 line-clamp-3">
                        {{ posts[0].title }}
                    </h2>
                    <p v-if="posts[0].description" class="text-sm md:text-base text-white/90 mb-6 line-clamp-2">
                        {{ posts[0].description }}
                    </p>
                    <UButton
color="primary" variant="solid" class="rounded-sm font-semibold uppercase tracking-wide"
                        :to="localePath(posts[0].path)">
                        {{ t('blog.readMore') }}
                    </UButton>
                </div>
            </div>
        </div>

        <!-- Secondary Featured Articles -->
        <div class="basis-full lg:basis-1/3 flex flex-col gap-4">
            <!-- Article 1 -->
            <div
v-if="posts[1]"
                class="group relative flex-1 min-h-[200px] lg:min-h-[240px] rounded-sm overflow-hidden border border-default bg-muted hover:border-primary transition-all duration-150">
                <NuxtImg
v-if="posts[1].image?.src" :src="posts[1].image.src" :alt="posts[1].title"
                    class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    format="webp" quality="80" width="640" loading="lazy" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-end">
                    <div class="w-full p-4 md:p-6 text-white">
                        <UBadge
v-if="posts[1].category" color="primary" variant="solid"
                            class="rounded-sm border border-primary/20 text-xs font-semibold mb-2">
                            {{ posts[1].category }}
                        </UBadge>
                        <h3 class="text-lg md:text-xl font-bold leading-tight line-clamp-2">
                                <NuxtLink :to="localePath(posts[1].path)" class="hover:underline">
                                {{ posts[1].title }}
                            </NuxtLink>
                        </h3>
                    </div>
                </div>
            </div>

            <!-- Article 2 -->
            <div
v-if="posts[2]"
                class="group relative flex-1 min-h-[200px] lg:min-h-[240px] rounded-sm overflow-hidden border border-default bg-muted hover:border-primary transition-all duration-150">
                <NuxtImg
v-if="posts[2].image?.src" :src="posts[2].image.src" :alt="posts[2].title"
                    class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    format="webp" quality="80" width="640" loading="lazy" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-end">
                    <div class="w-full p-4 md:p-6 text-white">
                        <UBadge
v-if="posts[2].category" color="primary" variant="solid"
                            class="rounded-sm border border-primary/20 text-xs font-semibold mb-2">
                            {{ posts[2].category }}
                        </UBadge>
                        <h3 class="text-lg md:text-xl font-bold leading-tight line-clamp-2">
                            <NuxtLink :to="localePath(posts[2].path)" class="hover:underline">
                                {{ posts[2].title }}
                            </NuxtLink>
                        </h3>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
const { posts } = defineProps({
    posts: {
        type: Array,
        default: () => []
    }
})

const localePath = useLocalePath()
const { t } = useI18n()
</script>