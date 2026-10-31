<template>
    <UFooter
:style="{ '--ui-container': '98rem' }" :ui="{
        root: 'bg-secondary text-white border-t-0',
        top: 'border-b border-white/10 py-10 lg:py-12',
        bottom: 'py-6',
        container: 'py-0 lg:flex lg:items-center lg:justify-between lg:gap-x-3',
        left: 'flex items-center justify-center lg:justify-start lg:flex-1 mt-0 lg:order-1',
        right: 'lg:flex-1 flex items-center justify-center lg:justify-end gap-x-1.5 lg:order-3 mt-4 lg:mt-0',
    }">
        <template #top>
            <UContainer>
                <UFooterColumns
:columns="footerColumns" :ui="{
                    root: 'xl:grid xl:grid-cols-4 xl:gap-12',
                    left: 'mb-10 xl:mb-0',
                    center: 'grid grid-cols-2 gap-8 lg:grid-cols-3 xl:col-span-3',
                    label: 'font-display text-xs font-bold uppercase tracking-wide text-white/50',
                    list: 'mt-4 space-y-3',
                    link: 'text-sm text-white/80 hover:text-primary transition-colors duration-150',
                }">
                    <template #left>
                        <NuxtLink :to="localePath('/')" class="inline-block max-w-xs">
                            <p class="font-display text-xl font-extrabold leading-none text-white">
                                Directory
                            </p>
                            <p class="font-display text-xl font-extrabold leading-none text-white/85">
                                Finder
                            </p>
                            <p class="mt-3 font-sans text-sm font-normal normal-case tracking-normal text-white/60">
                                {{ t('footerNav.tagline') }}
                            </p>
                        </NuxtLink>
                    </template>
                </UFooterColumns>
            </UContainer>
        </template>

        <template #left>
            <p class="text-sm text-white/60">
                © {{ copyrightYear }} DirectoryTemplate. {{ t('footer') }}
            </p>
        </template>

        <template #right>
            <USelectMenu
v-model="selectedLocale" :items="localeItems" by="code" :search-input="false"
                :content="{ align: 'end', side: 'top', sideOffset: 8 }"
                class="w-28" color="neutral" variant="outline"
                :ui="{
                    base: 'rounded-sm bg-transparent text-white ring-white/25 hover:ring-white/50',
                    trailingIcon: 'text-white/70',
                    content: 'rounded-sm',
                    item: 'rounded-sm',
                }"
                :aria-label="`${selectedLocale.label} — ${t('footerNav.language')}`">
                <template #leading>
                    <UIcon :name="selectedLocale.icon" />
                </template>
            </USelectMenu>
        </template>
    </UFooter>
</template>

<script setup lang="ts">
import type { FooterColumn } from '@nuxt/ui'
import { MOST_SEARCHED_CATEGORIES, getActivityLocaleSlug } from '~~/shared/activities'
import { cityHubPath } from '~~/shared/city-chain'
import { pillarPath, LOCALE_MENU_ITEMS, type LocaleMenuItem } from '~~/shared/nav'
import { hasDirectoryGuide } from '~~/shared/silo'

interface FooterCategory {
    slug: string
    name: string
    localeSlug: string
}

/** Featured city hubs — live 200s only (both chain patterns). URL built
 * through cityHubPath so the shape flips with directoryConfig.content.cityUrlPattern. */
const FOOTER_CITY_HUBS = [
    { name: 'Paris', countrySlug: 'france', citySlug: 'paris' },
    { name: 'Lyon', countrySlug: 'france', citySlug: 'lyon' },
    { name: 'Marseille', countrySlug: 'france', citySlug: 'marseille' },
    { name: 'London', countrySlug: 'united-kingdom', citySlug: 'london' },
    { name: 'Berlin', countrySlug: 'germany', citySlug: 'berlin' },
    { name: 'Hamburg', countrySlug: 'germany', citySlug: 'hamburg' },
    { name: 'Manchester', countrySlug: 'united-kingdom', citySlug: 'manchester' },
    { name: 'Köln', countrySlug: 'germany', citySlug: 'koln' },
    { name: 'Bordeaux', countrySlug: 'france', citySlug: 'bordeaux' },
    { name: 'Toulouse', countrySlug: 'france', citySlug: 'toulouse' },
] as const

const localeItems = LOCALE_MENU_ITEMS

const { locale, t, te } = useI18n()
const localePath = useLocalePath()
const { switchToLocale } = useLocaleSwitcher()
const copyrightYear = new Date().getFullYear()

const { data: footerCategoriesData } = await useAsyncData(
    'footer-categories',
    () => $fetch<{ data: Array<{ slug: string, name: string }> }>('/api/categories', { query: { locale: locale.value } }),
    { watch: [locale] },
)

const footerCategories = computed<FooterCategory[]>(() =>
    (footerCategoriesData.value?.data ?? []).map(s => ({
        slug: s.slug,
        name: s.name,
        localeSlug: getActivityLocaleSlug(s.slug, locale.value) ?? s.slug,
    })),
)

function cityLabel(name: string): string {
    const key = `eu_city_names.${name}`
    return te(key) ? t(key) : name
}

const footerColumns = computed<FooterColumn[]>(() => {
    const categoryChildren = MOST_SEARCHED_CATEGORIES
        .map(slug => footerCategories.value.find(s => s.slug === slug))
        .filter((s): s is FooterCategory => s != null)
        .map(s => ({ label: s.name, to: localePath(`/categories/${s.localeSlug}`) }))

    categoryChildren.push({ label: t('nav.allStyles'), to: localePath('/categories') })

    const cityChildren = FOOTER_CITY_HUBS.map(hub => ({
        label: cityLabel(hub.name),
        to: localePath(cityHubPath(hub.countrySlug, hub.citySlug)),
    }))
    cityChildren.push({ label: t('footerNav.allCities'), to: localePath('/country') })

    // Pillar-article link — omitted when the active locale has no
    // directoryConfig.content.pillarPaths entry (never a cross-locale link).
    const pillarTo = pillarPath(locale.value)

    return [
        {
            label: t('nav.categories.list'),
            children: categoryChildren,
        },
        {
            label: t('footerNav.cities'),
            children: cityChildren,
        },
        {
            label: t('footerNav.guides'),
            children: [
                { label: t('nav.blog'), to: localePath('/blog') },
                // Venue-index guide ships as content only for these locales — avoid a site-wide 404 link otherwise.
                ...(hasDirectoryGuide(locale.value)
                    ? [{ label: t('footerNav.guideVenue'), to: localePath('/venues/guide') }]
                    : []),
                ...(pillarTo
                    ? [{ label: t('footerNav.comparatif'), to: localePath(pillarTo) }]
                    : []),
                { label: t('footerNav.contact'), to: localePath('/contact') },
                { label: t('nav.about'), to: localePath('/about') },
                { label: t('footerNav.legal'), to: localePath('/legal') },
            ],
        },
    ]
})

const currentLocaleItem = computed(() =>
    localeItems.find(item => item.code === locale.value) ?? localeItems[0]!,
)

const selectedLocale = ref<LocaleMenuItem>(currentLocaleItem.value)

watch(selectedLocale, (selected) => {
    if (!selected?.code) return
    if (selected.code === locale.value) return
    void switchToLocale(selected.code)
})

watch(locale, () => {
    selectedLocale.value = currentLocaleItem.value
})
</script>
