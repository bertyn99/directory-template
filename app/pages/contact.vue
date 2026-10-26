<template>
    <UContainer class="h-[75dvh]">


        <UCard
class=" h-full max-w-6xl  mx-auto" :ui="{
            body: {
                base: 'flex flex-col h-full'
            }

        }">

            <div class="flex h-full gap-2">
                <div class="basis-1/2 px-4">
                    <h1 class="text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">{{ $t('contact.title') }}</h1>
                    <p class="mt-2 mb-8 text-lg leading-8 text-gray-600">{{ $t('contact.subtitle') }}</p>
                    <UForm
:schema="schema" :state="state" class=" flex  flex-col jusitify-evenly gap-y-6  "
                        @submit="submitForm">
                        <UFormField :label="$t('contact.form.name')" class="">
                            <UInput v-model="state.name" :placeholder="$t('contact.form.namePlaceholder')" />
                        </UFormField>
                        <UFormField :label="$t('contact.form.email')" class="">
                            <UInput v-model="state.email" type="email" :placeholder="$t('contact.form.emailPlaceholder')" />
                        </UFormField>
                        <UFormField :label="$t('contact.form.message')" class="">
                            <UTextarea v-model="state.message" :placeholder="$t('contact.form.messagePlaceholder')" />
                        </UFormField>
                        <UButton type="submit" color="primary" class="w-full">{{ $t('contact.form.submit') }}</UButton>
                    </UForm>

                </div>

                <div class="basis-1/2 rounded-md overflow-hidden relative ">
                    <img
class="h-64 w-full bg-gray-50 object-cover sm:h-80 lg:absolute lg:h-full"
                        src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&crop=focalpoint&fp-x=.4&w=2560&h=3413&&q=80"
                        alt="" >
                </div>
            </div>


        </UCard>
    </UContainer>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const schema = z.object({
    name: z.string().min(3, 'Must be at least 3 characters'),
    email: z.string().email('Invalid email'),
    message: z.string().min(8, 'Must be at least 8 characters')
})
type Schema = z.output<typeof schema>


const state = reactive({ name: '', email: '', message: '' });

const submitForm = (event: FormSubmitEvent<Schema>) => {
    // Handle form submission here
    console.log('Form submitted:', event.data)
    // You can add your form submission logic here, such as sending data to an API
}
</script>