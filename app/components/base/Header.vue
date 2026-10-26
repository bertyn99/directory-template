<template>
    <UHeader
title="Directory Finder" :to="localePath('/')" :style="{ '--ui-container': '98rem' }" :toggle="{
        color: 'neutral',
        variant: 'ghost',
        class: 'rounded-sm text-white hover:bg-white/10 hover:text-white',
    }" :ui="{
        root: 'bg-transparent border-none overflow-visible',
        container: 'overflow-visible',
        center: 'hidden lg:flex flex-1 justify-center overflow-visible',
        right: 'flex items-center justify-end gap-1.5 lg:flex-1',
        toggle: 'text-white',
    }">
        <template #title>
            <div class="text-xl font-extrabold text-white leading-none">
                Directory <br><span class="text-white/90 leading-tight">FINDER</span>
            </div>
        </template>

        <UNavigationMenu
:items="navigationItems" class="relative w-full max-w-none justify-center overflow-visible"
            :ui="{
                root: 'relative overflow-visible',
                viewportWrapper: 'absolute top-full left-1/2 z-50 w-[30rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-visible',
                viewport:
                    'w-[30rem] max-w-[calc(100vw-2rem)] min-w-[30rem] shadow-none ring-0 border border-default rounded-sm overflow-hidden bg-default',
                content: 'relative w-[30rem] max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto',
                childList: 'sm:w-96',
                childLinkDescription: 'text-balance line-clamp-2',
            }">
            <template #categories-content="{ item, close }">
                <BaseCategoriesNavMegaMenuPanel :item="item" :close="close" />
            </template>
        </UNavigationMenu>

        <template #right>
            <UModal v-model:open="isSearchModalOpen" :title="$t('common.search')">
                <UTooltip :text="$t('common.search')" :kbds="['meta', 'K']">
                    <UButton
icon="i-heroicons-magnifying-glass" color="neutral" variant="ghost" square
                        class="rounded-sm text-white hover:bg-white/10 hover:text-white"
                        :aria-label="$t('common.search')" />
                </UTooltip>
                <template #body>
                    <UCommandPalette
v-model:search-term="searchTerm" :loading="customloadingGroups" :groups="groups"
                        :placeholder="$t('home.search.placeholder')" class="h-80"
                        @update:model-value="onSearchSelect" />
                </template>
            </UModal>

            <UColorModeButton
color="neutral" variant="ghost"
                class="hidden rounded-sm text-white hover:bg-white/10 hover:text-white sm:inline-flex" />

            <AuthState>
                <template #default="{ loggedIn: isAuthed }">
                    <div class="flex shrink-0 items-center gap-1.5">
                        <UButton
:to="isAuthed ? localePath('/dashboard/venues') : localePath('/auth/register')"
                            icon="i-heroicons-plus" color="neutral" variant="outline"
                            class="rounded-sm bg-white font-display font-bold uppercase tracking-wide text-primary hover:bg-white/90 hover:text-primary"
                            :ui="{ leadingIcon: 'text-primary', label: 'hidden sm:inline' }" :label="$t('nav.addVenue')"
                            :aria-label="$t('nav.addVenue')" />

                        <UDropdownMenu
v-if="isAuthed" :items="userItems"
                            :content="{ align: 'end', side: 'bottom', sideOffset: 8 }" :ui="{
                                content: 'w-56 rounded-sm',
                                item: 'rounded-sm',
                            }">
                            <UButton
color="neutral" variant="ghost" square
                                class="rounded-sm ring-1 ring-white/30 hover:bg-white/10" :avatar="{
                                    src: user?.avatarUrl || undefined,
                                    alt: user?.username || user?.email || 'User',
                                }" :aria-label="user?.username || $t('auth.signedInAs')" />
                        </UDropdownMenu>

                        <UButton
v-else :to="localePath('/auth/login')" color="neutral" variant="ghost"
                            square
                            icon="i-heroicons-user"
                            class="hidden rounded-sm text-white hover:bg-white/10 hover:text-white sm:inline-flex"
                            :aria-label="$t('auth.signIn')" />
                    </div>
                </template>
                <template #placeholder>
                    <div class="flex shrink-0 items-center gap-1.5">
                        <USkeleton class="h-8 w-8 rounded-sm bg-white/20 sm:w-36" />
                        <USkeleton class="hidden h-8 w-24 rounded-sm bg-white/20 sm:block" />
                    </div>
                </template>
            </AuthState>
        </template>

        <template #body>
            <UNavigationMenu :items="navigationItems" orientation="vertical" class="-mx-2.5" />

            <div class="mt-6 space-y-3 px-2.5">
                <UButton
:to="loggedIn ? localePath('/dashboard/venues') : localePath('/auth/register')"
                    icon="i-heroicons-plus" color="primary" variant="solid" block
                    class="rounded-sm font-display font-bold uppercase tracking-wide" :label="$t('nav.addVenue')" />
                <UButton
v-if="!loggedIn" :to="localePath('/auth/login')" color="neutral" variant="outline" block
                    class="rounded-sm" icon="i-heroicons-user" :label="$t('auth.signIn')" />
                <USelectMenu
v-model="selectedLocale" :items="items" :search-input="false" class="w-full"
                    :content="{ align: 'start' }" :aria-label="selectedLocale?.label">
                    <template #leading>
                        <UIcon :name="selectedLocale?.icon ?? 'i-flag:fr-4x3'" />
                    </template>
                </USelectMenu>
            </div>
        </template>
    </UHeader>


</template>

<script setup lang="ts">
import { refDebounced } from '@vueuse/core'
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'
import { MOST_SEARCHED_CATEGORIES, CATEGORY_FAMILIES, getActivityLocaleSlug } from '~~/shared/activities'
import { LOCALE_MENU_ITEMS } from '~~/shared/nav'
import { resolveContentLocale } from '~~/shared/silo'

const route = useRoute()
const { user, loggedIn, clear } = useUserSession()
const isSearchModalOpen = ref(false)
const { locale, t } = useI18n()
const localePath = useLocalePath()
const { switchToLocale } = useLocaleSwitcher()
const searchTerm = ref('')
const searchTermDebounced = refDebounced(searchTerm, 200)

defineShortcuts({
    meta_k: {
        handler: () => {
            isSearchModalOpen.value = true
        },
    },
})

function onSearchSelect() {
    isSearchModalOpen.value = false
    searchTerm.value = ''
}

const activeLocale = computed(() => resolveContentLocale(locale.value))

const { data: navCategoriesData } = await useAsyncData(
    'nav-categories',
    () => $fetch<{ data: Array<{ slug: string, name: string }> }>('/api/categories', { query: { locale: activeLocale.value } }),
    { watch: [locale] },
)
const navCategories = computed(() => navCategoriesData.value?.data ?? [])

/** Categories shown in the desktop mega-menu (right column). */
const NAV_MEGA_MENU_STYLES_LIMIT = 6

const mostSearchedItems = computed(() => {
    return MOST_SEARCHED_CATEGORIES.slice(0, NAV_MEGA_MENU_STYLES_LIMIT)
        .map((slug) => {
            const category = navCategories.value.find(s => s.slug === slug)
            if (!category) return null

            const family = CATEGORY_FAMILIES.find(f => f.categories.includes(slug))
            const localeSlug = getActivityLocaleSlug(category.slug, locale.value) ?? category.slug

            return {
                name: category.name,
                slug: category.slug,
                to: localePath(`/categories/${localeSlug}`),
                description: family ? t(family.labelKey) : t('nav.explore'),
            }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
})

const navigationItems = computed<NavigationMenuItem[]>(() => [
    {
        label: t('nav.categories.list'),
        slot: 'categories',
        active: route.path.startsWith(localePath('/categories')),
        children: mostSearchedItems.value.map(category => ({
            label: category.name,
            description: category.description,
            to: category.to,
        })),
    },
    { label: t('nav.venues'), to: localePath('/venues'), active: route.path.startsWith(localePath('/venues')) },
    { label: t('nav.countries'), to: localePath('/country'), active: route.path.startsWith(localePath('/country')) },
])

const userItems = computed<DropdownMenuItem[][]>(() => [
    [{
        type: 'label',
        label: user.value?.email ?? user.value?.username ?? t('auth.signedInAs'),
        avatar: {
            src: user.value?.avatarUrl || undefined,
            alt: user.value?.username || user.value?.email || 'User',
        },
    }],
    [{
        label: t('dashboard.nav.home'),
        icon: 'i-heroicons-home',
        to: localePath('/dashboard'),
    }, {
        label: t('dashboard.nav.settings'),
        icon: 'i-heroicons-cog-8-tooth',
        to: localePath('/dashboard/settings'),
    }],
    [{
        label: t('auth.signOut'),
        icon: 'i-heroicons-arrow-left-on-rectangle',
        onSelect: () => {
            void clear()
        },
    }],
])

const items = LOCALE_MENU_ITEMS

const { data: cities, status: citiesStatus } = useLazyFetch('/api/cities', {
    key: 'command-palette-cities',
    query: {
        search: searchTermDebounced,
        limit: 10
    },
    watch: [searchTermDebounced]
})

const citiesItems = computed(() => {
    return cities?.value?.map((city: { id: number, name: string, slug: string }) => ({
        id: city.id,
        label: city.name,
        slug: city.slug,
        to: localePath(`/venues?city=${city.slug}`),
        icon: 'i-heroicons-map-pin'
    })) || []
})
const { data: categories, status: categoriesStatus } = useLazyFetch('/api/categories', {
    key: 'command-palette-categories',
    query: {
        search: searchTermDebounced,
        limit: 10,
        locale,
    },
    watch: [searchTermDebounced, locale],
    transform: (resp: { data: { id: number, name: string, slug: string, slugs?: Record<string, string> }[] }) => resp.data.map(category => ({
        id: category.id,
        label: category.name,
        slug: category.slug,
        slugs: category.slugs,
    })),
})

const categoriesItems = computed(() => {
    return categories?.value?.map((category: { id: number, name: string, slug: string, slugs?: Record<string, string> }) => ({
        id: category.id,
        label: category.label ?? category.name,
        icon: 'i-heroicons-sparkles',
        to: localePath(`/categories/${getActivityLocaleSlug(category.slug, locale.value) ?? category.slug}`),
    })) || []
})
const { data: countries, status: countriesStatus } = useLazyFetch('/api/countries', {
    key: 'command-palette-countries',
    query: {
        search: searchTermDebounced,
        limit: 10
    },
})

const countriesItems = computed(() => {
    return countries?.value?.countries.map((country: { id: number, name: string, code: string, slug: string }) => ({
        id: country.id,
        label: country.name,
        icon: 'i-heroicons-globe-alt',
        to: localePath(`/venues?country=${country.code}`),
    })) || []
})
const customloadingGroups = computed(() => citiesStatus.value === 'pending' || categoriesStatus.value === 'pending' || countriesStatus.value === 'pending')

const groups = computed(() => [{
    id: 'cities',
    label: searchTerm.value ? t('search.groups.cities') : t('search.groups.cities'),
    items: citiesItems.value,
    ignoreFilter: true
}, {
    id: 'categories',
    label: t('search.groups.categories'),
    items: categoriesItems.value,
    ignoreFilter: true
}, {
    id: 'countries',
    label: t('search.groups.countries'),
    items: countriesItems.value,
    ignoreFilter: true
}])


const getCurrentLocale = computed(() =>
    items.find(item => item.code === locale.value) ?? items[0]
)

const selectedLocale = ref(getCurrentLocale.value)

watch(selectedLocale, (selected) => {
    if (!selected?.code) return
    if (selected.code === locale.value) return
    void switchToLocale(selected.code)
})

watch(locale, () => {
    selectedLocale.value = getCurrentLocale.value
})
</script>