<template>
    <section
        class="relative z-40 bg-gradient-to-br from-primary-600 to-primary-400"
        :class="[
            isHome ? 'overflow-hidden min-h-[90vh] sm:min-h-[85vh] md:min-h-[80vh] lg:min-h-[85vh]' : 'overflow-visible',
        ]"
    >

        <!-- Subtle Pattern Overlay -->
        <div
            class="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"/>

        <slot />

        <template v-if="isHome">
            <!-- Main Content -->
            <UContainer
                :style="{ '--ui-container': '98rem' }"
                class="relative z-40 grid h-full grid-cols-1 items-stretch gap-8 px-4 py-12 sm:px-6 md:gap-12 md:px-8 md:py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12 lg:px-8 lg:py-16 xl:gap-16 xl:px-12 xl:py-10">

                <!-- Left Side: Image (Desktop: Left, Mobile: Bottom) -->
                <div
                    class="relative order-2 min-h-[min(52vh,28rem)] lg:order-1 lg:min-h-0">
                    <div class="absolute inset-0">
                        <NuxtImg
                            src="/img/hero-showcase.png"
                            alt=""
                            width="579"
                            height="1400"
                            fit="inside"
                            loading="eager"
                            fetchpriority="high"
                            :preload="{ fetchPriority: 'high' }"
                            sizes="sm:280px md:360px lg:480px xl:560px"
                            format="webp"
                            class="h-full w-full object-contain object-bottom" />
                    </div>

                    <!-- Glow behind image -->
                    <div
                        class="absolute top-1/2 left-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 blur-[80px] -z-10 pointer-events-none" />
                </div>

                <!-- Right Side: Content (Desktop: Right, Mobile: Top) -->
                <div
                    class="z-20 order-1 flex flex-col items-center gap-8 text-center text-white lg:order-2 lg:items-start lg:text-left">

                    <h1
                        class="text-4xl sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl font-black tracking-tight leading-[1.1] mb-4 md:mb-6">
                        <span class="block text-white drop-shadow-sm mb-2">
                            {{ $t('home.title.pt1') }}
                        </span>
                        <span class="relative inline-block">
                            <span class="absolute inset-0 bg-white transform -skew-x-6 shadow-xl rounded-sm"/>
                            <span class="relative z-10 text-black px-4 py-1 block transform -skew-x-6">
                                {{ $t('home.title.pt2') }}
                            </span>
                        </span>
                    </h1>

                    <p
                        class="text-base sm:text-lg md:text-xl lg:text-xl xl:text-2xl text-white font-medium leading-relaxed max-w-xl mb-4 md:mb-6">
                        {{ $t('home.subTitle') }}
                    </p>
                    <NuxtLink
                        v-if="pillarPath"
                        :to="localePath(pillarPath)"
                        class="mb-6 md:mb-8 lg:mb-10 inline-flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-white underline decoration-white/50 underline-offset-4 transition-colors duration-150 hover:decoration-white"
                    >
                        {{ $t('home.pillarCta') }}
                        <UIcon name="i-heroicons-arrow-right" class="size-4" />
                    </NuxtLink>

                    <!-- Search Box — above the bottom wave (z-30): the column is a
                         grid item with its own stacking context, so the wrapper
                         needs explicit position + z to escape the wave's cover -->
                    <div class="relative z-50 w-full max-w-lg mb-4 md:mb-6 lg:mb-8 xl:mb-0">
                        <div class="flex flex-col sm:flex-row gap-3">
                            <UInputMenu
v-model="search" v-model:search-term="searchTerm" :items="cities"
                                label-key="name" :loading="status === 'pending'"
                                :popper="{ arrow: false, placement: 'bottom-start' }" icon="i-heroicons-map-pin"
                                :placeholder="$t('home.search.placeholder')" class="flex-grow" size="xl"
                                :ui="{ color: { white: { outline: 'bg-white border-0 focus:ring-0 text-gray-900 placeholder-gray-500' } }, icon: { trailing: { pointer: '' } }, base: 'shadow-lg !rounded-sm h-14', padding: { xl: 'px-4 py-3' } }">
                                <template #empty>
                                    <div class="p-3 text-sm text-gray-500 text-center">
                                        {{ $t('home.search.nofound') }}
                                    </div>
                                </template>
                            </UInputMenu>

                            <UButton
size="xl" color="neutral" variant="solid" :aria-label="$t('common.search', 'Explorer')"
                                class="justify-center px-6 md:px-8 rounded-sm font-bold h-14 transition-transform hover:scale-105 active:scale-95"
                                @click="searchWithThisLocation">
                                <UIcon name="i-heroicons-magnifying-glass" class="w-6 h-6 sm:mr-2" />
                                <span class="hidden sm:inline text-base md:text-lg">{{ $t('common.search', 'Explorer')
                                }}</span>
                            </UButton>
                        </div>
                    </div>
                </div>

            </UContainer>

            <!-- Decorative Elements -->
            <div class="absolute inset-0 pointer-events-none overflow-hidden">

                <!-- Decorative Bubble 1 -->
                <div
                    class="absolute top-[40%] right-[-10px] lg:right-[5%] w-14 h-14 lg:w-20 lg:h-20 bg-neutral-300 rounded-full overflow-hidden border-4 border-white/30 shadow-xl animate-pulse-slow">
<NuxtImg
src="/img/hero-bubble.png" alt="" loading="lazy" format="webp" quality="80" width="160"
    class="w-full h-full object-cover mix-blend-multiply opacity-90" />
                </div>

                <!-- Decorative Bubble 2 -->
                <div
                    class="absolute bottom-[25%] right-[8%] lg:right-[12%] w-20 h-20 lg:w-24 lg:h-24 bg-neutral-400 rounded-full overflow-hidden border-4 border-white/30 shadow-xl z-20 transition-transform hover:scale-110 duration-300">
                    <NuxtImg src="/img/venue-fallback.png" alt="" loading="lazy" format="webp" quality="80" width="192" class="w-full h-full object-cover opacity-90" />
                </div>
            </div>

            <!-- Bottom Angled Shape - Adaptive Wave with Pure CSS -->
            <div class="wave-container absolute bottom-0 left-0 right-0 z-30">
                <svg
viewBox="0 0 1440 100" class="wave-svg w-full h-full text-gray-50 dark:text-gray-900 fill-current"
                    preserveAspectRatio="none">
                    <path d="M0,100 L1440,0 L1440,100 Z"/>
                </svg>
            </div>

        </template>

    </section>
</template>

<script setup>
import { refDebounced } from '@vueuse/core'
import { pillarPath as pillarPathFor } from '~~/shared/nav'
const route = useRoute()
const router = useRouter()
const search = ref(null);
const searchTerm = ref('');
const localePath = useLocalePath()
const { locale } = useI18n()
// Pillar-article CTA — hidden entirely when the active locale has no
// directoryConfig.content.pillarPaths entry (never a cross-locale link).
const pillarPath = computed(() => pillarPathFor(locale.value))
const isHome = computed(() => route.name?.includes('index__') ?? false)

const searchTermDebounced = refDebounced(searchTerm, 200)

// Client-only fetch: the city list is only needed once the user types in the
// search box. Awaiting it in SSR added a serial DB round trip to EVERY page's
// TTFB (this hero renders in the default layout on all templates).
const { data: cities, status } = useLazyFetch('/api/cities', {
    key: 'command-palette-cities',
    server: false,
    query: {
        search: searchTermDebounced,
        limit: 10
    },
})


const searchWithThisLocation = () => {
    const citySlug = typeof search.value === 'string' ? search.value : (search.value?.slug || '')
    if (!citySlug) return
    router.push(`/venues?city=${citySlug}`)
}
</script>

<style scoped>
.animate-bounce-slow {
    animation: bounce 4s infinite;
}

.animate-pulse-slow {
    animation: pulse 5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes bounce {

    0%,
    100% {
        transform: translateY(-15%);
    }

    50% {
        transform: translateY(0);
    }
}

/* Adaptive Wave - Pure CSS with viewport units */
.wave-container {
    /* Adaptive height using clamp with viewport units */
    height: clamp(4.5rem, 8dvh, 7rem);
    overflow: hidden;
    /* Mobile: Move wave up more to show more content */
    transform: translateY(clamp(-2rem, -3dvh, -1rem));
}

.wave-svg {
    /* Base SVG path creates gentle angle, we'll clip it for steeper angles */
    width: 100%;
    height: 100%;
    /* Mobile: clip to show steeper angle (top at 22%) */
    clip-path: polygon(0 100%, 100% 22%, 100% 100%, 0 100%);
}

/* Tablet: Medium angle (top at 15%) - Move wave up moderately */
@media (min-width: 768px) {
    .wave-container {
        height: clamp(5rem, 10dvh, 6rem);
        transform: translateY(clamp(-1.5rem, -2dvh, -0.5rem));
    }

    .wave-svg {
        clip-path: polygon(0 100%, 100% 15%, 100% 100%, 0 100%);
    }
}

/* Desktop: Gentle angle (full SVG visible, top at 0%) */
@media (min-width: 1024px) {
    .wave-container {
        height: clamp(6rem, 12dvh, 7rem);
        /* Desktop: Minimal or no translate, keep at bottom */
        transform: translateY(1px);
    }

    .wave-svg {
        clip-path: polygon(0 100%, 100% 0%, 100% 100%, 0 100%);
    }
}

/* Large Desktop: Larger height */
@media (min-width: 1280px) {
    .wave-container {
        height: clamp(7rem, 14dvh, 8rem);
    }
}
</style>
