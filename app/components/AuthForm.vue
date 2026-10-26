<script lang="ts" setup>
import type { PropType } from "vue";
import type { FormError, FormErrorEvent } from '#ui/types'
import type { fieldType } from "@/types"
import { z } from 'zod'


const emit = defineEmits(['error', 'submit'])
type FormState = Record<string, string>
type ValidateFn = (state: FormState) => Promise<FormError[]> | FormError[]
const props = defineProps({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        default: "",
    },
    fields: {
        type: Array as PropType<fieldType>,
        default: () => [
            { label: "Email", type: "email", placeholder: "Enter your email" },
            {
                label: "Password",
                type: "password",
                placeholder: "Enter your password",
            },
        ],
    },
    align: {
        type: String as PropType<"bottomn" | "top">,
        default: "center",
    },
    submitButton: {
        type: String,
    },
    loading: {
        type: Boolean,
        default: false,
    },
    icon: {
        type: String,
        default: "i-heroicons-lock-closed",
    },
    wrapper: {
        type: String,
        default: "w-full max-w-sm space-y-6",
    },
    providers: {
        type: Array as PropType<
            {
                label: string;
                icon: string;
                color: string;
                click: () => void;
            }[]
        >,
        default: () => [],
    },
    validate: {
        type: Function as PropType<ValidateFn>,
        default: () => []
    }
});
//generate a reactive state object that adapts with the fields
const state = reactive<FormState>(
    props.fields.reduce((acc, field) => {
        acc[field.label.toLowerCase()] = "";
        return acc;
    }, {} as FormState)
);

function onSubmit() {
    emit('submit', state)
}


const schema = z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Must be at least 8 characters')
})

type Schema = z.output<typeof schema>



async function onError(event: FormErrorEvent) {
    console.log(event.errors);
    const element = document.getElementById(event.errors[0].id)
    element?.focus()
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
//watch state for changes


const hasMultipleProviders = computed(() => props.providers.length > 1);
</script>

<template>
    <div :class="wrapper">
        <UIcon :name="icon" class="w-16 h-16 mx-auto text-center text-primary-500 dark:text-primary-400" />
        <h2 class="text-2xl text-gray-900 dark:text-white font-bold">
            {{ title }}
        </h2>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
            <slot name="description">{{ description }}</slot>
        </p>
        <UContainer class="mx-0 px-0 gap-y-6 flex flex-col">
            <div v-if="providers.length" class="flex space-x-2">
                <template v-for="provider in providers" :key="provider.label">
                    <UButton
:color="provider.color" :icon="provider.icon" dynamic :trailing="false"
                        :label="provider.label" :block="!hasMultipleProviders" @click="provider.click()" />
                </template>
            </div>
            <UDivider label="OR" />
            <UForm ref="form" :state="state" class="space-y-6" :schema="schema" @submit="onSubmit" @error="onError">
                <UFormField
v-for="field in fields" :key="field.label" :label="field.label"
                    :name="field.label.toLowerCase()">
                    <UInput
v-model="state[field.label.toLowerCase()]" :placeholder="field.placeholder"
                        :type="field.type" :ui="{ rounded: 'rounded-sm' }" />
                </UFormField>

                <UButton type="submit" :disabled="loading" block :ui="{ rounded: 'rounded-sm' }">{{
                    submitButton ?? "Submit"
                    }}</UButton>
            </UForm>
        </UContainer>
    </div>
</template>

<style scoped></style>