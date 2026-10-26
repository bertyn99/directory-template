<script setup lang="ts">
import type { FormErrorEvent, FormSubmitEvent } from '#ui/types'
import type { z } from 'zod'
import { loginSchema, useAuth } from '~/composables/useAuth'

definePageMeta({
    layout: "auth"
})
const { t } = useI18n()

    useSeoMeta({
    title: () => t('auth.login.title'),
})

type Schema = z.output<typeof loginSchema>

    const state = reactive<Partial<Schema>>({
    email: '',
    password: '',
})

const { login, loading, error: authError } = useAuth()
const toast = useToast()
const form = useTemplateRef('form')

async function onSubmit(event: FormSubmitEvent<Schema>) {
    const success = await login(event.data)
    if (success) {
        navigateTo("/dashboard")
        toast.add({ title: t('auth.login.toastSuccess'), description: t('auth.login.toastSuccessDesc'), color: 'success' })
    } else {
        // Use nextTick to ensure error is set before showing toast
        await nextTick()
        const errorMessage = authError.value || t('auth.login.toastErrorDesc')
        toast.add({
            title: t('auth.login.toastError'),
            description: errorMessage,
            color: 'error',
        })

        console.log(errorMessage)
    }
}

async function onError(event: FormErrorEvent) {
    const firstError = event?.errors?.[0]
    if (firstError?.id) {
        const element = document.getElementById(firstError.id)
        element?.focus()
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
}
</script>

<template>
    <UContainer class="w-full max-w-5xl px-6">
        <div class="grid gap-12 lg:grid-cols-2 items-center">
            <!-- Left Column: Editorial/Brand -->
            <div class="space-y-8 relative">
                <!-- Technical Label -->
                <div class="flex items-center gap-3">
                    <div class="h-px w-8 bg-primary"/>
                    <span class="text-xs font-mono uppercase tracking-widest text-primary font-bold">
                        {{ $t('auth.login.technicalLabel') }}
                    </span>
                </div>

                <!-- Main Headline -->
                <div class="space-y-4">
                    <h1
                        class="text-5xl md:text-6xl font-display font-bold uppercase leading-[0.9] tracking-tighter text-default">
                        {{ $t('auth.login.headline1') }}<br >
                        <span class="text-primary">{{ $t('auth.login.headline2') }}</span><br >
                        {{ $t('auth.login.headline3') }}
                    </h1>
                    <p class="text-lg text-muted max-w-md border-l-2 border-muted pl-4">
                        {{ $t('auth.login.description') }}
                    </p>
                </div>

                <!-- Feature List (Technical Specs) -->
                <div class="grid grid-cols-1 gap-4 pt-4">
                    <div class="flex items-center gap-3 text-sm font-medium text-default">
                        <UIcon name="i-heroicons-shield-check" class="size-5 text-primary" />
                        <span class="uppercase tracking-wide">{{ $t('auth.login.feature1') }}</span>
                    </div>
                    <div class="flex items-center gap-3 text-sm font-medium text-default">
                        <UIcon name="i-heroicons-bolt" class="size-5 text-primary" />
                        <span class="uppercase tracking-wide">{{ $t('auth.login.feature2') }}</span>
                    </div>
                </div>
            </div>

            <!-- Right Column: Login Form -->
            <div class="relative">
                <!-- Decorative Elements behind card -->
                <div
                    class="absolute -top-3 -right-3 size-24 border-t-2 border-r-2 border-primary/20 rounded-tr-xl pointer-events-none"/>
                <div
                    class="absolute -bottom-3 -left-3 size-24 border-b-2 border-l-2 border-primary/20 rounded-bl-xl pointer-events-none"/>

                <UCard
class="rounded-sm border-2 border-default bg-white dark:bg-gray-900 shadow-none" :ui="{
                    header: 'p-6 sm:p-8 pb-0',
                    body: 'p-6 sm:p-8'
                }">
                    <template #header>
                        <div class="flex items-start justify-between mb-2">
                            <div>
                                <p class="text-xs font-mono uppercase tracking-widest text-secondary mb-2">{{ $t('auth.login.cardLabel') }}</p>
                                <h2 class="text-2xl font-display font-bold uppercase text-default">{{ $t('auth.login.cardTitle') }}</h2>
                            </div>
                            <UIcon name="i-heroicons-finger-print" class="size-10 text-muted/20" />
                        </div>
                    </template>

                    <UForm ref="form" :schema="loginSchema" :state="state" class="space-y-6" @submit="onSubmit" @error="onError">
                        <UFormField
:label="$t('auth.login.emailLabel')" name="email"
                            class="font-bold uppercase text-xs tracking-wide text-secondary">
                            <UInput
v-model="state.email" :placeholder="$t('auth.login.emailPlaceholder')" type="email" autocomplete="email"
                                size="lg" :ui="{
                                    base: 'rounded-sm border-2 border-gray-200 dark:border-gray-800 bg-transparent text-default placeholder:text-muted focus:border-primary focus:ring-0 transition-colors px-4 py-3',
                                }" class="w-full mt-1">
                                <template #trailing>
                                    <UIcon name="i-heroicons-envelope" class="text-muted" />
                                </template>
                            </UInput>
                        </UFormField>

                        <UFormField
:label="$t('auth.login.passwordLabel')" name="password"
                            class="font-bold uppercase text-xs tracking-wide text-secondary">
                            <UInput
v-model="state.password" :placeholder="$t('auth.login.passwordPlaceholder')" type="password"
                                autocomplete="current-password" size="lg" :ui="{
                                    base: 'rounded-sm border-2 border-gray-200 dark:border-gray-800 bg-transparent text-default placeholder:text-muted focus:border-primary focus:ring-0 transition-colors px-4 py-3',
                                }" class="w-full mt-1">
                                <template #trailing>
                                    <UIcon name="i-heroicons-lock-closed" class="text-muted" />
                                </template>
                            </UInput>
                        </UFormField>

                        <div class="flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
                            <NuxtLink
to="/"
                                class="text-muted hover:text-primary transition-colors inline-flex items-center gap-2">
                                <UIcon name="i-heroicons-arrow-left" class="size-4" /> {{ $t('auth.login.back') }}
                            </NuxtLink>
                            <NuxtLink
to="/auth/reset-password"
                                class="text-muted hover:text-primary transition-colors">
                                {{ $t('auth.login.forgotPassword') }}
                            </NuxtLink>
                        </div>

                        <div class="text-center text-sm text-muted pt-2">
                            {{ $t('auth.login.noAccount') }}
                            <NuxtLink to="/auth/register" class="text-primary hover:text-primary-dark font-semibold transition-colors">
                                {{ $t('auth.login.signUp') }}
                            </NuxtLink>
                        </div>

                        <UButton
type="submit" color="primary" variant="solid" block size="xl" :loading="loading" :disabled="form?.errors?.value?.length > 0"
                            class="rounded-sm font-display font-bold uppercase tracking-widest text-lg">
                            {{ $t('auth.login.submit') }}
                        </UButton>
                    </UForm>
                </UCard>
            </div>
        </div>
    </UContainer>
</template>
