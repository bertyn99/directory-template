<template>
    <UContainer class="py-10 space-y-8">
        <UBreadcrumb :links="breadcrumbLinks" />

        <div v-if="venue" class="space-y-8">
            <section class="rounded-sm border border-default bg-muted px-6 py-6 space-y-4">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div class="space-y-2">
                        <p class="text-xs uppercase tracking-[0.35em] text-muted">{{ $t('venues.profile') }}</p>
                        <h1 class="text-3xl text-default leading-tight">{{ venueName }}</h1>
                        <p class="flex items-center gap-2 text-toned">
                            <UIcon name="i-heroicons-map-pin" class="text-primary" />
                            <span>{{ locationLabel }}</span>
                        </p>
                    </div>
                    <div class="flex flex-wrap gap-3">
                        <UButton
v-if="venue.website" :href="ensureUrl(venue.website)" target="_blank" rel="noopener noreferrer"
                            color="primary" class="rounded-sm">
                            {{ $t('venues.visitWebsite') }}
                        </UButton>
                        <UButton
v-if="venue.address" :href="getMapLink()" target="_blank" variant="ghost"
                            class="rounded-sm border border-default" icon="i-mdi:earth">
                            {{ $t('venues.openMap') }}
                        </UButton>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div class="rounded-sm border border-default bg-default px-4 py-3">
                        <p class="text-3xl font-semibold text-default">{{ activitiesCount }}</p>
                        <p class="text-xs uppercase tracking-wide text-muted">{{ $t('venues.categories') }}</p>
                    </div>
                    <div class="rounded-sm border border-default bg-default px-4 py-3">
                        <p class="text-lg font-semibold text-default">{{ updatedLabel ?? '—' }}</p>
                        <p class="text-xs uppercase tracking-wide text-muted">{{ $t('venues.lastUpdate') }}</p>
                    </div>
                    <div v-if="venue.openingHours" class="rounded-sm border border-default bg-default px-4 py-3">
                        <p class="text-lg font-semibold text-default">{{ $t('venues.status.posted') }}
                        </p>
                        <p class="text-xs uppercase tracking-wide text-muted">{{ $t('venues.openingHours') }}</p>
                    </div>
                </div>
            </section>

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <!-- Main Info -->
                <div class="space-y-6 lg:col-span-2">
                    <UCard class="border border-default bg-default rounded-sm">
                        <template #header>
                            <div class="flex justify-between items-center">
                                <h2 class="text-xl font-semibold text-default">{{ $t('venues.info') }}</h2>
                                <UBadge v-if="venue.rating" color="primary" variant="soft" class="rounded-sm">
                                    {{ formatRating(venue.rating) }}
                                </UBadge>
                            </div>
                        </template>

                        <img
v-if="venue.searchPicture" :src="venue.searchPicture" :alt="venue.name"
                            class="w-full h-64 object-cover rounded-sm border border-default mb-4">
                        <div v-if="venue.description" class="space-y-4">
                            <!-- Intro stays plain interpolated text: single line, also feeds the
                                 meta description. Body renders through <MDC>: the AI/owner-supplied
                                 markdown (## headings, **bold**, lists) is parsed to real elements
                                 and raw HTML is escaped by default — still no v-html anywhere. -->
                            <p
v-if="descriptionFormatedByLocale?.intro"
                                class="text-default text-base font-medium whitespace-pre-line">
                                {{ descriptionFormatedByLocale.intro }}</p>
                            <MDC
v-if="descriptionFormatedByLocale?.text"
                                :value="descriptionFormatedByLocale.text" tag="div"
                                class="text-toned text-base [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-default [&_p]:my-2 [&_p]:leading-relaxed [&>*:first-child]:mt-0" />
                        </div>
                        <!-- Activities Section -->
                        <div v-if="activitiesList.length" class="mt-6 space-y-3">
                            <h3 class="text-xl font-semibold text-default">{{ $t('venues.categories') }}</h3>
                            <div class="flex flex-wrap gap-2">
                                <template v-for="activity in activityLinks" :key="activity.name">
                                    <NuxtLink v-if="activity.to" :to="activity.to" class="inline-block">
                                        <UBadge
color="primary"
                                            variant="soft" class="rounded-sm border border-primary/30 text-xs font-medium hover:border-primary transition-colors">
                                            {{ activity.name }}
                                        </UBadge>
                                    </NuxtLink>
                                    <UBadge
v-else
                                        color="primary"
                                        variant="soft" class="rounded-sm border border-primary/30 text-xs font-medium">
                                        {{ activity.name }}
                                    </UBadge>
                                </template>
                            </div>
                        </div>

                        <div v-if="venue.subscription" class="mt-4 text-sm text-toned">
                            <span class="font-semibold text-default">{{ $t('venues.subscription') }}:</span> {{ venue.subscription }}
                        </div>

                        <div v-if="venue.website" class="mt-2 text-sm text-toned">
                            <span class="font-semibold text-default">{{ $t('venues.website') }}:</span>
                            <a
:href="ensureUrl(venue.website)" target="_blank" rel="noopener noreferrer nofollow"
                                class="underline decoration-primary decoration-2 underline-offset-4">{{ venue.website
                                }}</a>
                        </div>

                        <div v-if="venue.tel" class="mt-2 text-sm text-toned">
                            <span class="font-semibold text-default">{{ $t('venues.tel') }}:</span> {{ venue.tel }}
                        </div>
                    </UCard>

                    <UCard v-if="venue.address" class="border border-default bg-default rounded-sm">
                        <template #header>
                            <h2 class="text-xl font-semibold text-default">{{ $t('venues.location') }}</h2>
                        </template>
                        <div class="space-y-3">
                            <UButton
:href="getMapLink()" target="_blank" variant="ghost"
                                class="w-full justify-start rounded-sm border border-default" icon="i-mdi:earth">
                                {{ formatAddress(venue.address) }}
                            </UButton>
                            <p class="text-sm text-muted">{{ $t('venues.mapHint') }}</p>
                        </div>
                    </UCard>
                </div>

                <!-- Side Info -->
                <div class="space-y-6">
                    <UCard v-if="venue.openingHours" class="border border-default bg-default rounded-sm">
                        <template #header>
                            <h2 class="text-xl font-semibold text-default">{{ $t('venues.openingHours') }}</h2>
                        </template>
                        <ul class="space-y-2 text-sm text-default">
                            <li
v-for="(hours, day) in openingHourFormated" :key="day"
                                class="flex items-center justify-between border-b border-muted pb-2 last:border-0 last:pb-0">
                                <span class="font-medium uppercase tracking-wide text-muted">{{ day }}</span>
                                <span>{{ hours.from }} – {{ hours.to }}</span>
                            </li>
                        </ul>
                    </UCard>

                    <UCard v-if="venue.socialMedia" class="border border-default bg-default rounded-sm">
                        <template #header>
                            <h2 class="text-xl font-semibold text-default">{{ $t('venues.socialMedia') }}</h2>
                        </template>
                        <ul class="space-y-2 text-sm text-default">
                            <li
v-for="(link, platform) in venue.socialMedia" :key="platform"
                                class="flex items-center gap-3">
                                <UBadge variant="soft" class="rounded-sm border border-default uppercase tracking-wide">
                                    {{ platform }}
                                </UBadge>
                                <a
:href="ensureUrl(link as string)" target="_blank" rel="noopener noreferrer"
                                    class="text-primary underline">{{
                                        link }}</a>
                            </li>
                        </ul>
                    </UCard>

                    <UCard v-if="venue.access?.[locale] || venue.access?.fr || venue.access?.en" class="border border-default bg-default rounded-sm">
                        <template #header>
                            <h2 class="text-xl font-semibold text-default">{{ $t('venues.access') }}</h2>
                        </template>
                        <div class="flex flex-col gap-3">
                            <div
v-for="acces in (venue.access[locale] || venue.access.fr || venue.access.en || [])" :key="acces.text"
                                class="flex flex-wrap items-center gap-3 rounded-sm border border-muted px-3 py-2">
                                <UBadge variant="soft" class="rounded-sm border border-default">
                                    <UIcon :name="getTransportIcon(acces.name)" class="w-5 h-5" />
                                </UBadge>

                                <span class="capitalize text-sm text-default">{{ acces.text }}</span>
                            </div>
                        </div>
                    </UCard>
                </div>
            </div>
        </div>
    </UContainer>
</template>

<script setup lang="ts">
import {
    findActivityDefinition,
    getActivityLocaleSlug,
} from '~~/shared/activities'

const route = useRoute();
const { t, locale } = useI18n();
const localePath = useLocalePath()
const requestUrl = useRequestURL()

/** Prepends https:// to URLs missing a protocol so browsers don't treat them as relative paths. */
function ensureUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//.test(url)) return url;
  return `https://${url}`;
}

const venueSlug = computed(() => route.params.slug ?? '');
const { data: venue, error: venueError } = await useAsyncData(`venue-${venueSlug.value}`, () => $fetch(`/api/venues/${venueSlug.value}`), {
    transform: (dataRes) => dataRes.data
});

if (venueError.value) {
  throw createError({
    statusCode: venueError.value.statusCode || 500,
    statusMessage: venueError.value.statusMessage || 'Failed to load venue',
  })
}

if (!venue.value) {
  throw createError({ statusCode: 404, statusMessage: 'Venue not found' })
}

const venueName = computed(() => decodeHtmlEntities(venue.value?.name));

const breadcrumbLinks = computed(() => [
    { label: t('nav.home'), to: localePath('/') },
    { label: t('nav.venues'), to: localePath('/venues') },
    { label: venueName.value, to: localePath(`/venues/${venue.value?.slug}`) }
]);

const openingHourFormated = computed(() => formatSchedule(venue.value?.openingHours));

const descriptionFormatedByLocale = computed(() => formatDescription(venue.value?.description, locale.value) ?? null)

const activitiesList = computed(() => {
    const list = venue.value?.activities
    if (!list) return []
    if (Array.isArray(list)) return list.filter(Boolean)
    if (typeof list === 'string') {
        return list.replace(/[{}]/g, '')
            .split(',')
            .map((activity) => activity.trim())
            .filter(Boolean)
    }
    return []
})

// Resolve each activity name to its category page URL
const activityLinks = computed(() => {
    return activitiesList.value.map((name) => {
        const def = findActivityDefinition(name)
        const canonicalSlug = def?.slug ?? null
        const localeSlug = canonicalSlug
            ? (getActivityLocaleSlug(canonicalSlug, locale.value) ?? canonicalSlug)
            : null
        return {
            name,
            to: localeSlug ? localePath(`/categories/${localeSlug}`) : null,
        }
    })
})

const activitiesCount = computed(() => activitiesList.value.length)
const locationLabel = computed(() => venue.value?.address ? formatAddress(venue.value.address) : t('venues.location'))
const updatedLabel = computed(() => {
    if (!venue.value?.updatedAt) return null
    try {
        const date = new Date(venue.value.updatedAt)
        return new Intl.DateTimeFormat(locale.value || 'en', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(date)
    } catch {
        return null
    }
})

const { getMapLink } = useMapLink(formatAddress(venue.value?.address))

// Schema.org — LocalBusiness contact data (YGG-65/YGG-196): telephone + address
// + hours must be visible to the SERP. Phone-number queries ("0143070909")
// ranked pos 5–6 with zero clicks because the number wasn't in the snippet.
const SCHEMA_DAY_MAP: Record<string, string> = {
  monday: 'Monday', mon: 'Monday', montag: 'Monday', lundi: 'Monday', lunes: 'Monday', lunedi: 'Monday',
  tuesday: 'Tuesday', tue: 'Tuesday', dienstag: 'Tuesday', mardi: 'Tuesday', martes: 'Tuesday', martedi: 'Tuesday',
  wednesday: 'Wednesday', wed: 'Wednesday', mittwoch: 'Wednesday', mercredi: 'Wednesday', miercoles: 'Wednesday', mercoledi: 'Wednesday',
  thursday: 'Thursday', thu: 'Thursday', donnerstag: 'Thursday', jeudi: 'Thursday', jueves: 'Thursday', giovedi: 'Thursday',
  friday: 'Friday', fri: 'Friday', freitag: 'Friday', vendredi: 'Friday', viernes: 'Friday', venerdi: 'Friday',
  saturday: 'Saturday', sat: 'Saturday', samstag: 'Saturday', samedi: 'Saturday', sabado: 'Saturday', sabato: 'Saturday',
  sunday: 'Sunday', sun: 'Sunday', sonntag: 'Sunday', dimanche: 'Sunday', domingo: 'Sunday', domenica: 'Sunday',
}

const openingHoursSpec = computed(() => {
  const formatted = openingHourFormated.value
  if (!formatted) return undefined
  const specs: Array<{ '@type': 'OpeningHoursSpecification', dayOfWeek: string[], opens: string, closes: string }> = []
  for (const [day, hours] of Object.entries(formatted)) {
    const schemaDay = SCHEMA_DAY_MAP[day.toLowerCase()]
    if (!schemaDay || !hours?.from || !hours?.to) continue
    specs.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: [schemaDay], opens: hours.from, closes: hours.to })
  }
  return specs.length > 0 ? specs : undefined
})

// Dynamic SEO title — global titleTemplate appends "| Directory Template".
// Suffix promises the practical data on the page (hours/phone/price) so the
// snippet can intercept brand queries against the venue's own site (YGG-196).
useSeoMeta({
  title: () => venue.value ? `${venueName.value} — ${t('venues.seoSuffix')}` : 'Directory Template',
  description: () => {
    const intro = descriptionFormatedByLocale.value?.intro
    return intro ? intro.substring(0, 160).replace(/<br>/g, ' ') : `${venueName.value} - Find venues on Directory Template`
  },
  ogTitle: () => venue.value ? venueName.value : 'Directory Template',
  ogDescription: () => {
    const intro = descriptionFormatedByLocale.value?.intro
    return intro ? intro.substring(0, 160).replace(/<br>/g, ' ') : `${venueName.value} - Find venues on Directory Template`
  },
  ogImage: () => venue.value?.searchPicture || '/img/og-default.jpg',
  ogUrl: () => `${requestUrl.origin}${requestUrl.pathname}`,
  twitterCard: 'summary_large_image',
})

// Schema.org
useSchemaOrg([
  defineBreadcrumb({
    itemListElement: [
      { name: 'Home', item: '/' },
      { name: 'Venues', item: '/venues' },
      { name: () => venue.value?.name ?? '' }
    ]
  }),
  venue.value
    ? defineLocalBusiness({
        name: venueName.value,
        telephone: venue.value.tel || undefined,
        url: () => `${requestUrl.origin}${requestUrl.pathname}`,
        image: venue.value.searchPicture || undefined,
        address: venue.value.address
          ? {
              streetAddress: venue.value.address.street1 || undefined,
              addressLocality: venue.value.address.city?.name || undefined,
              addressCountry: venue.value.address.city?.country?.code || undefined,
            }
          : undefined,
        geo: venue.value.address?.lat && venue.value.address?.lng
          ? { latitude: Number(venue.value.address.lat), longitude: Number(venue.value.address.lng) }
          : undefined,
        openingHoursSpecification: openingHoursSpec.value,
      })
    : undefined,
  defineWebPage({
    '@type': 'WebPage',
    name: () => venueName.value,
    description: () => {
      const intro = descriptionFormatedByLocale.value?.intro
      return intro ? intro.substring(0, 200).replace(/<br>/g, ' ') : undefined
    }
  }),
])

useSetI18nParams({
  slug: () => venue.value?.slug ?? ''
})
</script>