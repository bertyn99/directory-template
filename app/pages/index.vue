<template>
    <div>
        <!-- Below-fold sections: Lazy + hydration strategies so mobile
             hydration work only happens where the section needs it.
             hydrate-never = pure display content, JS never executes. -->
        <LazySectionEvolution hydrate-never />
        <LazySectionPopularCategories hydrate-never />
        <LazySectionStats hydrate-never />

        <!-- Ad leaderboard — first-party proxied AdSense, renders nothing until configured -->
        <LazyAdsAdUnit placement="home" variant="leaderboard" hydrate-on-visible class="container mx-auto px-4 my-12" />

        <LazySectionFeaturingVenues hydrate-on-visible />
        <LazySectionTestimonials hydrate-never />
        <LazySectionLastarticles hydrate-never />
        <LazySectionFaq hydrate-on-idle />

        <!-- CTA Section -->
        <section class="py-20 bg-gradient-to-br from-primary-700 to-primary-500">
            <div class="container mx-auto px-4 text-center">
                <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">
                    {{ t('home.cta.title') }}
                </h2>
                <p class="text-lg text-white mb-8 max-w-2xl mx-auto">
                    {{ t('home.cta.description') }}
                </p>
                <UButton
                    :to="localePath('/venues')"
                    size="xl"
                    variant="solid"
                    class="font-bold px-8 py-3 rounded-sm text-base"
                >
                    {{ t('home.cta.button') }}
                </UButton>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { directoryConfig } from '~~/directory.config'

const { t } = useI18n()
const localePath = useLocalePath()

definePageMeta({
    breadcrumb: {
        icon: 'i-heroicons-home',
    },
})

defineOgImage('NuxtSeo', {
})

const homeTitle = `${t('home.title.pt1')} ${t('home.title.pt2')}`
const seoTitle = t('home.seoTitle')

useSeoMeta({
    title: seoTitle,
    ogTitle: seoTitle,
    description: t('home.subTitle'),
    ogDescription: t('home.subTitle'),
    ogType: 'website',
    twitterCard: 'summary_large_image',
})

// Homepage seoTitle already leads with the brand ("Directory Template — …"),
// so disable the global "| Directory Template" template to avoid duplication.
useHead({
    titleTemplate: '%s',
})

useSchemaOrg([
    defineWebPage({
        name: seoTitle,
        '@type': ['WebPage','FAQPage'],
    }),
    defineWebSite({
        name: directoryConfig.name,
        url: directoryConfig.url,
        potentialAction: [
            defineSearchAction({
                target: `${localePath('/venues')}?city={search_term_string}`,
            }),
        ],
    }),
    defineQuestion({
        name: t('home.faq.q1'),
        acceptedAnswer: t('home.faq.a1'),
    }),
    defineQuestion({
        name: t('home.faq.q2'),
        acceptedAnswer: t('home.faq.a2'),
    }),
    defineQuestion({
        name: t('home.faq.q3'),
        acceptedAnswer: t('home.faq.a3'),
    }),
    defineQuestion({
        name: t('home.faq.q4'),
        acceptedAnswer: t('home.faq.a4'),
    }),
    defineQuestion({
        name: t('home.faq.q5'),
        acceptedAnswer: t('home.faq.a5'),
    }),
])
</script>
