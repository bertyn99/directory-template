<script lang="ts" setup>
import type { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import type { insertVenueSchema} from '~~/server/db/schemas';
import { insertVenueWithAddressSchema } from '~~/server/db/schemas';
import { useCitySearch } from '~/composables/useCitySearch'
import { directoryConfig } from '~~/directory.config'
import { localizedCopy } from '~~/shared/affiliates'

type Schema = z.output<typeof insertVenueSchema>
type SchemaWithAddress = z.output<typeof insertVenueWithAddressSchema> & { id: number }


const { dataForm } = defineProps({
    dataForm: {
        type: Object as PropType<SchemaWithAddress>,
        required: true
    }
})

const loading = defineModel('loading')

const items = [{
    label: 'Venue information',
    icon: 'i-heroicons-information-circle',
    description: 'This is the content shown for Tab1'
}, {
    label: 'Location',
    icon: 'i-heroicons-map-pin',
    description: 'And, this is the content for Tab2'
}, {
    label: 'Media',
    icon: 'i-heroicons-media',
    description: 'And, this is the content for Tab2'
}]

const form = reactive<SchemaWithAddress>(dataForm)
const activeTab = ref('info')
const activeDescriptionTab = ref(0)
const activeAccessTab = ref(0)

const localeItems = [
    { label: 'French', key: 'fr' },
    { label: 'English', key: 'en' },
    { label: 'German', key: 'de' },
    { label: 'Spanish', key: 'es' },
    { label: 'Italian', key: 'it' },
    { label: 'Portuguese', key: 'pt' }
]

localeItems.forEach(locale => {
    if (!form.description) form.description = {}
    if (!form.description[locale.key]) {
        form.description[locale.key] = { text: '', intro: '' }
    }
})

const typeOptions = ref([])
const franchiseOptions = ref([])
const cityOptions = ref([])
const activityOptions = ref([])
const equipmentOptions = ref([])

const { loading: loadingCities, searchCities } = useCitySearch()
const toast = useToast()
const { csrf } = useCsrf()
const { locale } = useI18n()

/** Booking partner options (directoryConfig.booking.partners) — the select
    is hidden entirely when the list is empty (plain CTAs only). */
const bookingPartnerItems = computed(() => [
    ...directoryConfig.booking.partners.map(partner => ({
        label: localizedCopy(partner.label, locale.value),
        value: partner.id,
    })),
])

const btnSubmit = ref();
const onSubmitOutsideForm = () => btnSubmit.value.click();
const onSubmit = async (event: FormSubmitEvent<Schema>) => {
    loading.value = true
    try {
        const response = await useRequestFetch()(`/api/users/venues`, {
            method: 'PUT',
            body: {
                id: form.id,
                ...event.data,
                // "None" select option ⇒ absent key, never an empty string.
                bookingPartner: event.data.bookingPartner || undefined,
            },
            headers: { 'csrf-token': csrf }
        })

        if (response.success) {
            toast.add({ title: 'Venue updated successfully!', icon: 'i-heroicons-check-circle' })
            await refreshNuxtData('myVenues') // Refresh the list of venues
            emit('submitted')
        } else {
            toast.add({ title: 'Error updating venue', description: response.message, icon: 'i-heroicons-exclamation-circle', color: 'red' })
        }
    } catch (error: unknown) {
        let errorMessage = 'An unknown error occurred.'
        if (error instanceof Error) {
            errorMessage = error.message
        } else if (typeof error === 'object' && error !== null && 'message' in error) {
            errorMessage = (error as { message: string }).message
        }
        toast.add({ title: 'Error updating venue', description: errorMessage, icon: 'i-heroicons-exclamation-circle', color: 'red' })
    } finally {
        loading.value = false
    }
}

defineExpose({ onSubmitOutsideForm })

//emit onSubmit
const emit = defineEmits(['submitted'])
</script>

<template>
    <UForm :schema="insertVenueWithAddressSchema" :state="form" class="space-y-8 px-4" @submit="onSubmit">
        <UTabs :items="items" class="mb-6" :ui="{ list: { rounded: 'rounded-sm' } }">

            <template #item="{ item }">

                <div v-if="item.label === 'Venue information'">
                    <div class="grid grid-cols-2 gap-4 py-2">
                        <UFormField label="Name" name="name">
                            <UInput v-model="form.name" :ui="{ rounded: 'rounded-sm' }" />
                        </UFormField>
                        <UFormField label="Telephone" name="tel">
                            <UInput v-model="form.tel" :ui="{ rounded: 'rounded-sm' }" />
                        </UFormField>
                        <UFormField label="Website" name="website" class="col-span-2">
                            <UInput v-model="form.website" :ui="{ rounded: 'rounded-sm' }" />
                        </UFormField>
                        <UFormField label="Booking URL" name="bookingUrl" class="col-span-2">
                            <UInput v-model="form.bookingUrl" :ui="{ rounded: 'rounded-sm' }" />
                        </UFormField>
                        <UFormField
v-if="bookingPartnerItems.length" label="Booking Partner"
                            name="bookingPartner" class="col-span-2">
                            <USelect
v-model="form.bookingPartner" :items="bookingPartnerItems"
                                placeholder="— None —" :ui="{ rounded: 'rounded-sm' }" />
                        </UFormField>

                    </div>
                    <UFormField label="Description" name="description" class="mt-4">
                        <UTabs v-model="activeDescriptionTab" :items="localeItems">
                            <template #item="{ item }">
                                <UTextarea v-if="form.description[item.key]" v-model="form.description[item.key].text" label="Text" class="mb-2" :ui="{ rounded: 'rounded-sm' }" />
                                <UTextarea v-if="form.description[item.key]" v-model="form.description[item.key].intro" label="Intro" :ui="{ rounded: 'rounded-sm' }" />
                            </template>
                        </UTabs>
                    </UFormField>
                </div>

                <div v-if="item.label === 'media'" class="py-2">
                    <UFormField label="Search Picture" name="searchPicture">
                        <UInput v-model="form.searchPicture" :ui="{ rounded: 'rounded-sm' }" />
                    </UFormField>
                    <UFormField label="Social Media" name="socialMedia" class="mt-4">
                        <div class="grid grid-cols-3 gap-4">
                            <UInput v-model="form.socialMedia.facebook" label="Facebook" :ui="{ rounded: 'rounded-sm' }" />
                            <UInput v-model="form.socialMedia.twitter" label="Twitter" :ui="{ rounded: 'rounded-sm' }" />
                            <UInput v-model="form.socialMedia.instagram" label="Instagram" :ui="{ rounded: 'rounded-sm' }" />
                        </div>
                    </UFormField>
                </div>

                <div v-if="item.label === 'Location'" class="space-y-3">

                    <UFormField label="Street" name="street1">
                        <UInput v-model="form.address.street1" :ui="{ rounded: 'rounded-sm' }" />
                    </UFormField>
                    <UFormField label="Street" hint="Optional" name="street2">
                        <UInput v-model="form.address.street2" :ui="{ rounded: 'rounded-sm' }" />
                    </UFormField>
                    <UFormField label="Postal Code" name="zip">
                        <UInput v-model="form.address.zip" :ui="{ rounded: 'rounded-sm' }" />
                    </UFormField>
                    <UFormField :label="$t('venues.filter.city.name')">
                        <USelectMenu
v-model="form.address.cityId" :loading="loadingCities" :searchable="searchCities"
                            value-key="id" option-label="name" :placeholder="$t('venues.filter.city.name')"
                            :searchable-lazy="true" :ui="{ rounded: 'rounded-sm' }" />
                    </UFormField>


                    <UFormField label="Access" name="access" class="mt-4"/>
                    <UFormField label="Opening Hours" name="openingHours" class="mt-4">
                        <UTextarea v-model="form.openingHours" :ui="{ rounded: 'rounded-sm' }" />
                    </UFormField>
                </div>

            </template>
        </UTabs>

        <button ref="btnSubmit" type="submit" class="hidden" />
    </UForm>
</template>