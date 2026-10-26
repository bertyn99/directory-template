<template>
    <section class="py-16 sm:py-20 bg-default">
        <div class="mx-auto max-w-3xl px-6 lg:px-8">
            <h2 class="text-center text-3xl font-bold tracking-tight mb-12">
                {{ t('home.faq.title') }}
            </h2>
            <UAccordion
                :items="faqItems"
                type="multiple"
                :ui="{
                    root: 'divide-y divide-default',
                    item: 'py-0',
                    trigger: 'flex items-center justify-between w-full py-4 text-left text-sm font-semibold hover:text-primary transition-colors duration-150',
                    body: 'text-sm text-muted leading-relaxed pb-4',
                    trailingIcon: 'text-muted size-5 shrink-0',
                }"
            />
        </div>
    </section>
</template>

<script setup lang="ts">
const { t } = useI18n()

const faqItems = computed(() => [
    { label: t('home.faq.q1'), content: t('home.faq.a1'), defaultOpen: true },
    { label: t('home.faq.q2'), content: t('home.faq.a2') },
    { label: t('home.faq.q3'), content: t('home.faq.a3') },
    { label: t('home.faq.q4'), content: t('home.faq.a4') },
    { label: t('home.faq.q5'), content: t('home.faq.a5') },
])
</script>
