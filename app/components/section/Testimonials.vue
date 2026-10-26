<script setup lang="ts">
const { t } = useI18n()

const testimonials = computed(() => [
    {
        initials: 'SM',
        name: 'Sophie M.',
        quote: t('home.testimonials.quote1'),
        role: t('home.testimonials.role1'),
    },
    {
        initials: 'MD',
        name: 'Marc D.',
        quote: t('home.testimonials.quote2'),
        role: t('home.testimonials.role2'),
    },
    {
        initials: 'KB',
        name: 'Karim B.',
        quote: t('home.testimonials.quote3'),
        role: t('home.testimonials.role3'),
    },
])
</script>

<template>
    <section class="py-16">
        <div class="container mx-auto">
            <h2 class="text-3xl font-bold text-center text-primary mb-12">
                {{ t('home.testimonials.title') }}
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <UCard
                    v-for="testimonial in testimonials"
                    :key="testimonial.name"
                    class="p-6 rounded-sm border border-default shadow-none"
                >
                    <p class="text-default mb-6 leading-relaxed italic">
                        "{{ testimonial.quote }}"
                    </p>
                    <div class="flex items-center">
                        <div
                            class="w-12 h-12 rounded-sm bg-primary text-white flex items-center justify-center font-bold text-sm mr-4"
                        >
                            {{ testimonial.initials }}
                        </div>
                        <div>
                            <p class="font-bold text-default">
                                {{ testimonial.name }}
                            </p>
                            <p class="text-muted text-sm">
                                {{ testimonial.role }}
                            </p>
                        </div>
                    </div>
                </UCard>
            </div>
        </div>
    </section>
</template>
