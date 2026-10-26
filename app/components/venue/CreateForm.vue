<template>
    <div>

        <UTabs v-model="currentStep" :items="items" :ui="{ list: { rounded: 'rounded-sm' } }">

            <template #item="{ item }">
                <UForm
v-if="item.label !== 'Address'" :schema="insertVenueSchema" :state="state" class=" space-y-3"
                    @submit="onSubmitStep1">
                    <UFormField label="Venue Name" name="name">
                        <UInput v-model="state.name" :ui="{ rounded: 'rounded-sm' }" />
                    </UFormField>

                    <!--        <UFormField label="Franchise" name="franchiseId">
            <USelect v-model="state.franchiseId" :items="franchiseOptions" />
        </UFormField> -->
                    <!--  <UFormField label="Search Picture" name="searchPicture">
                <UInput v-model="state.searchPicture" type="url" />
            </UFormField> 
            <UFormField label="Subscription" name="subscription">
                <UInput v-model="state.subscription" />
            </UFormField>-->
                    <UFormField label="Description" name="description">
                        <UTextarea v-model="state.description[locale ?? 'fr'].text" :ui="{ rounded: 'rounded-sm' }" />
                    </UFormField>
                    <UFormField label="Website" name="website">
                        <UInput v-model="state.website" type="url" :ui="{ rounded: 'rounded-sm' }" />
                    </UFormField>
                    <UFormField label="Telephone" name="tel">
                        <UInput v-model="state.tel" type="tel" :ui="{ rounded: 'rounded-sm' }" />
                    </UFormField>
                    <!--  <UFormField label="Trial Button Text" name="txtTrialButton">
                <UInput v-model="state.txtTrialButton" />
            </UFormField> -->
                    <UButton type="submit" :disabled="loading" :ui="{ rounded: 'rounded-sm' }">Submit</UButton>
                </UForm>

                <UForm
v-else :schema="insertAddressSchema" :state="state.address" class="space-y-3"
                    @submit="onSubmitStep2" @error="onError">
                    <UFormField label="Street" name="street1">
                        <UInput v-model="state.address.street1" :ui="{ rounded: 'rounded-sm' }" />
                    </UFormField>
                    <UFormField label="Street" name="street2">
                        <UInput v-model="state.address.street2" :ui="{ rounded: 'rounded-sm' }" />
                    </UFormField>
                    <UFormField label="Postal Code" name="zip">
                        <UInput v-model="state.address.zip" :ui="{ rounded: 'rounded-sm' }" />
                    </UFormField>
                    <UFormField :label="$t('venues.filter.city.name')">
                        <USelectMenu
v-model="state.address.cityId" :loading="loadingCities" :searchable="searchCities"
                            value-key="id" option-label="name" :placeholder="$t('venues.filter.city.name')"
                            :searchable-lazy="true" :ui="{ rounded: 'rounded-sm' }" />
                    </UFormField>

                    <div class="flex justify-between">
                        <UButton variant="outline" :ui="{ rounded: 'rounded-sm' }" @click="currentStep = 0">Back</UButton>
                        <UButton type="submit" :loading="loading" :ui="{ rounded: 'rounded-sm' }">Submit</UButton>
                    </div>
                </UForm>
            </template>
        </UTabs>

    </div>

</template>

<script setup lang="ts">
import type { z } from 'zod'
import type { FormSubmitEvent, FormError, FormErrorEvent, } from '#ui/types'
import { insertVenueSchema, insertVenueWithAddressSchema, insertAddressSchema } from '~~/server/db/schemas';
import { useCitySearch } from '~/composables/useCitySearch'


const { close } = defineProps({
    close: {
        type: Function,
        default: () => { }
    }
})
const { locale } = useI18n()
const loading = ref(false)
const { csrf } = useCsrf()
const { loading: loadingCities, searchCities } = useCitySearch()
const currentStep = ref(0)
const accesNextStep = ref(false)
const items = computed(() => [{
    label: 'Venue information',
    icon: 'i-heroicons-information-circle',
    description: 'This is the content shown for Tab1'
}, {
    label: 'Address',
    icon: 'i-heroicons-map-pin',
    disabled: !accesNextStep.value,
    description: 'And, this is the content for Tab2'
}])


type Schema = z.output<typeof insertVenueSchema>

type SchemaWithAddress = z.output<typeof insertAddressSchema>


type CityOption = {
    id: number
    name: string
    slug?: string
    [key: string]: unknown
}

const state = reactive({
    name: '',
    categoryId: null as number | null,
    franchiseId: null as number | null,
    description: {
        fr: { text: '', intro: '' },
        en: { text: '', intro: '' },
        de: { text: '', intro: '' },
        es: { text: '', intro: '' },
        it: { text: '', intro: '' },
        pt: { text: '', intro: '' },
    },
    website: undefined as string | undefined,
    tel: '',
    address: {
        street1: undefined,
        street2: undefined,
        cityId: undefined,
        state: undefined,
        zip: undefined,
    }
})

const onSubmitStep1 = (event: FormSubmitEvent<Schema>) => {
    // Handle form submission
    /*    console.log(event.data) */
    accesNextStep.value = true
    currentStep.value = 1


}

const onSubmitStep2 = async (event: FormSubmitEvent<SchemaWithAddress>) => {
    // Handle form submission
    console.log(event.data)
    loading.value = true;
    try {
const venueRes = await useRequestFetch()("/api/users/venues", {
method: "POST",
body: state,
            headers: { 'csrf-token': csrf }
        })
loading.value = false;
        if (venueRes && venueRes.success) {
            //clear the data of list of venues of the user
            await refreshNuxtData('myVenues')

            //close the modal
            close()
        }
    } catch (error: unknown) {
        console.log(error);
        loading.value = false;
    }


}


async function onError(event: FormErrorEvent) {
    const element = document.getElementById(event.errors[0].id)

    /*   element?.focus()
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' }) */
}
</script>