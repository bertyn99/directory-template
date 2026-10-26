<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
    collapsed?: boolean
}>()

const { user, clear } = useUserSession()
const { logout } = useAuth()
const colorMode = useColorMode()

const items = computed<DropdownMenuItem[][]>(() => [
    [{
        type: 'label',
        label: user.value?.email || 'User',
        avatar: {
            src: user.value?.avatar || `https://ui-avatars.com/api/?name=${user.value?.username || 'User'}&background=random`,
            alt: user.value?.username || 'User'
        }
    }],
    [{
        label: 'Profile',
        icon: 'i-lucide-user',
        to: '/dashboard/profile'
    }, {
        label: 'Settings',
        icon: 'i-lucide-settings',
        to: '/dashboard/settings'
    }],
    [{
        label: 'Appearance',
        icon: 'i-lucide-sun-moon',
        children: [{
            label: 'Light',
            icon: 'i-lucide-sun',
            type: 'checkbox',
            checked: colorMode.value === 'light',
            onSelect(e: Event) {
                e.preventDefault()
                colorMode.preference = 'light'
            }
        }, {
            label: 'Dark',
            icon: 'i-lucide-moon',
            type: 'checkbox',
            checked: colorMode.value === 'dark',
            onSelect(e: Event) {
                e.preventDefault()
                colorMode.preference = 'dark'
            }
        }]
    }],
    [{
        label: 'Log out',
        icon: 'i-lucide-log-out',
        onSelect: async () => await logout()
    }]
])
</script>

<template>
    <UDropdownMenu
:items="items" :content="{ align: 'start', collisionPadding: 12 }" :ui="{
        content: 'w-56 rounded-sm ring-1 ring-default',
        item: 'rounded-sm data-highlighted:text-primary data-highlighted:bg-primary/10',
        itemLeadingIcon: 'text-muted group-data-highlighted:text-primary'
    }">
        <UButton
v-bind="{
            label: collapsed ? undefined : (user?.username || 'User'),
            avatar: {
                src: user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'User'}&background=random`,
                alt: user?.username || 'User',
                size: 'xs'
            },
            trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
        }" color="neutral" variant="ghost" block :square="collapsed"
            class="w-full justify-start rounded-sm hover:bg-muted transition-colors"
            :class="{ 'justify-center': collapsed }" :ui="{
                base: 'rounded-sm',
                trailingIcon: 'text-muted ms-auto'
            }" />
    </UDropdownMenu>
</template>
