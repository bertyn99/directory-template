<template>
    <UCard
        class="group flex h-full flex-col overflow-hidden border border-default bg-default rounded-sm transition-all duration-150 hover:border-primary">
        <!-- Blog Image -->
        <div v-if="post.image?.src" class="relative h-48 w-full overflow-hidden bg-muted rounded-t-sm">
            <NuxtImg
:src="post.image.src" :alt="post.title"
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                format="webp" quality="80" width="640" loading="lazy" />
        </div>

        <!-- Content -->
        <div class="flex flex-1 flex-col min-h-0">
            <div class="flex-1 flex flex-col gap-4 px-5 pt-6 pb-4">
                <!-- Category and Date -->
                <div class="flex items-center gap-3 flex-wrap">
                    <UBadge
v-if="post.category" color="primary" variant="soft"
                        class="rounded-sm border border-primary/30 text-xs font-medium uppercase tracking-wide">
                        {{ post.category }}
                    </UBadge>
                    <time v-if="post.date" :datetime="post.date" class="text-xs text-muted">
                        {{ formattedDate }}
                    </time>
                </div>

                <!-- Title -->
                <div class="space-y-2">
                    <h3
                        class="text-xl font-semibold leading-tight text-default line-clamp-2 group-hover:text-primary transition-colors">
                        <NuxtLink :to="localePath(post.path)" class="hover:underline">
                            {{ post.title }}
                        </NuxtLink>
                    </h3>
                    <p v-if="post.description" class="text-sm text-toned line-clamp-3 leading-relaxed">
                        {{ post.description }}
                    </p>
                </div>
            </div>

            <!-- Author Footer -->
            <div v-if="post.author?.name" class="px-5 pb-6 pt-4 border-t border-default">
                <div class="flex items-center gap-3">
                    <NuxtImg
v-if="authorImageUrl" :src="authorImageUrl" :alt="post.author.name" width="64"
                        format="webp" quality="80"
                        class="h-8 w-8 rounded-sm bg-muted object-cover border border-default" />
                    <div class="text-sm">
                        <p class="font-medium text-default">{{ post.author.name }}</p>
                        <p v-if="post.author.description" class="text-xs text-muted">{{ post.author.description }}</p>
                    </div>
                </div>
            </div>
        </div>
    </UCard>
</template>

<script setup lang="ts">
const { post } = defineProps({
    post: {
        type: Object,
        required: true
    }
})

const localePath = useLocalePath()
const { locale } = useI18n()

const formattedDate = computed(() => formatDate(post.date, { locale: locale.value }))

const authorImageUrl = computed(() =>
    post.author?.avatar?.src || ''
)
</script>