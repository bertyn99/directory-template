<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { NavigationMenuItem } from '@nuxt/ui'

const open = ref(true)
const breadcrumbItems = useBreadcrumbItems()


const { t } = useI18n()
const localePath = useLocalePath()

const isAdmin = computed(() => (useUserSession().user.value as { role?: string } | null)?.role === 'admin')

const links = computed<NavigationMenuItem[][]>(() => {
    const main: NavigationMenuItem[] = [
    {
        label: t('dashboard.overview.title'),
        icon: 'i-lucide-house',
        to: localePath('/dashboard'),
        exact: true
    },
    {
        label: t('dashboard.venues.title'),
        icon: 'i-lucide-dumbbell',
        to: localePath('/dashboard/venues')
    },
    {
        label: t('dashboard.nav.franchise'),
        icon: 'i-lucide-building-2',
        to: localePath('/dashboard/franchise')
    },
    {
        label: t('dashboard.nav.settings'),
        icon: 'i-lucide-settings',
        to: localePath('/dashboard/settings')
    }
    ]

    if (isAdmin.value) {
        main.push(
            {
                label: t('dashboard.admin.matchCandidates'),
                icon: 'i-lucide-shield-check',
                to: localePath('/dashboard/admin/match-candidates')
            },
            {
                label: t('dashboard.admin.enrichVenues'),
                icon: 'i-lucide-sparkles',
                to: localePath('/dashboard/admin/enrich-venues')
            }
        )
    }

    return [main]
})

const groups = computed(() => [{
    id: 'links',
    label: 'Navigate',
    items: links.value.flat()
}])
</script>

<template>
    <UDashboardGroup storage="cookie" unit="rem" class="bg-default text-default font-sans h-screen">
        <UDashboardSidebar
v-model:open="open" collapsible resizable class="bg-muted border-e border-default"
            :ui="{ root: 'border-e border-default', footer: 'lg:border-t lg:border-default' }">
            <template #header="{ collapsed }">
                <Motion
tag="div"
                    :animate="{ width: collapsed ? '100%' : 'auto' }"
                    :transition="{ type: 'spring', stiffness: 300, damping: 30 }"
                    class="flex items-center gap-2 overflow-hidden">
                    <UIcon name="i-lucide:map-pin" class="text-primary size-6 shrink-0" />
                    <span v-if="!collapsed" class="font-display font-bold uppercase text-sm tracking-tight whitespace-nowrap">
                        Premium
                    </span>
                </Motion>
            </template>

            <template #default="{ collapsed }">
                <UDashboardSearchButton
:collapsed="collapsed"
                    class="bg-transparent ring-default border border-default rounded-sm hover:border-primary transition-colors duration-150" />

                <UNavigationMenu
:collapsed="collapsed" :items="links.flat()" orientation="vertical" tooltip popover
                    color="primary" :ui="{ link: 'before:rounded-sm', childLink: 'before:rounded-sm' }" class="mt-4" />
            </template>

            <template #footer>
                <SidebarUserDropdown class="w-full" />
            </template>
        </UDashboardSidebar>

        <UDashboardSearch :groups="groups" />

        <UDashboardPanel>
            <template #header>
                <UDashboardNavbar>
                    <template #left>
                        <UBreadcrumb :items="breadcrumbItems" class="hidden sm:flex" />
                    </template>
                    <template #right>
                        <div id="dashboard-navbar-actions" class="flex items-center gap-1.5" />
                    </template>
                </UDashboardNavbar>
            </template>

            <template #body>
                <slot />
            </template>
        </UDashboardPanel>
    </UDashboardGroup>
</template>
