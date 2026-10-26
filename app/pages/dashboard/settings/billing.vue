<script setup lang="ts">
import { Motion } from 'motion-v'

definePageMeta({
  name: 'Settings - Billing',
  layout: 'dashboard',
  middleware: ['auth'],
})

const { t } = useI18n()
const { user } = useUserSession()
const { checkout, navigateToStripeDashboard, getCurrentSubscription, plans, isYearly, items } = useStripe()
const {
  fadeSlideIn,
  fadeSlideInTransition,
  scaleIn,
  scaleInTransition,
  staggerChildren,
  staggerContainerTransition,
} = useDashboardAnimations()

const loading = ref(false)
const subscription = ref<{
  plan?: string
  status?: string
  currentPeriodEnd?: string
} | null>(null)

const hasPaidSubscription = computed(() => user.value?.hasPaidSubscription === true)

// Fetch current subscription
const { data: subscriptionData } = useAsyncData('current-subscription', async () => {
  try {
    const res = await getCurrentSubscription()
    return res
  }
  catch {
    return null
  }
})

watch(subscriptionData, (data) => {
  if (data) {
    subscription.value = data
  }
}, { immediate: true })

async function handleManageSubscription() {
  loading.value = true
  try {
    await navigateToStripeDashboard()
  }
  finally {
    loading.value = false
  }
}

async function handleUpgrade(lookupKey: string) {
  loading.value = true
  try {
    await checkout(lookupKey)
  }
  finally {
    loading.value = false
  }
}

const paidTiers = computed(() =>
  plans.value.filter(tier => tier.id !== 'tier-free'),
)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <Motion :variants="fadeSlideIn" initial="hidden" animate="visible" :transition="fadeSlideInTransition">
      <div>
        <h2 class="text-xl font-semibold font-display">{{ $t('dashboard.settings.title') }}</h2>
        <p class="text-sm text-muted mt-1">{{ $t('dashboard.settings.subtitle') }}</p>
      </div>
    </Motion>

    <!-- Tab Navigation -->
    <div class="flex gap-1 border-b border-default">
      <NuxtLink
        to="/dashboard/settings"
        class="relative px-4 py-2 text-sm font-medium transition-colors duration-150 text-muted hover:text-default border-b-2 border-transparent hover:border-muted"
      >
        {{ $t('dashboard.settings.tabs.profile') }}
      </NuxtLink>
      <NuxtLink
        to="/dashboard/settings/billing"
        class="relative px-4 py-2 text-sm font-medium transition-colors duration-150 text-primary border-b-2 border-primary"
      >
        {{ $t('dashboard.settings.tabs.billing') }}
      </NuxtLink>
    </div>

    <!-- Billing Content -->
    <Motion :variants="fadeSlideIn" initial="hidden" animate="visible" :transition="fadeSlideInTransition">
      <div class="space-y-6">
        <!-- Current Plan Card -->
        <div class="border border-default rounded-sm p-6 bg-default">
          <h3 class="text-lg font-semibold font-display mb-1">{{ $t('dashboard.settings.billing.title') }}</h3>
          <p class="text-sm text-muted mb-4">{{ $t('dashboard.settings.billing.subtitle') }}</p>

          <div v-if="hasPaidSubscription" class="space-y-4">
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-muted">{{ $t('dashboard.settings.billing.currentPlan') }}</span>
                <span class="text-sm font-semibold text-default">
                  {{ subscription?.plan || $t('dashboard.settings.billing.defaultPlan') }}
                </span>
              </div>
              <span class="inline-flex items-center rounded-sm bg-success/10 dark:bg-success/20 px-2 py-0.5 text-xs font-medium text-success dark:text-success">
                {{ $t('dashboard.settings.billing.active') }}
              </span>
            </div>

            <div v-if="subscription?.currentPeriodEnd" class="text-sm text-muted">
              {{ $t('dashboard.settings.billing.renewalDate') }}: {{ new Date(subscription.currentPeriodEnd).toLocaleDateString() }}
            </div>

            <Motion :while-press="{ scale: 0.98 }" :transition="{ duration: 0.1 }">
              <UButton
                :label="$t('dashboard.settings.billing.manageSubscription')"
                color="black"
                variant="solid"
                class="rounded-sm"
                :loading="loading"
                @click="handleManageSubscription"
              />
            </Motion>
          </div>

          <div v-else class="space-y-4">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-muted">{{ $t('dashboard.settings.billing.currentPlan') }}</span>
              <span class="text-sm font-semibold text-default">{{ $t('dashboard.settings.billing.free') }}</span>
            </div>
            <p class="text-sm text-muted">{{ $t('dashboard.settings.billing.noSubscription') }}</p>
          </div>
        </div>

        <!-- Billing Cycle Toggle -->
        <UTabs
          v-model="isYearly"
          :items="items"
          :content="false"
          size="sm"
          class="rounded-sm w-fit"
        />

        <!-- Upgrade Plans -->
        <div v-if="!hasPaidSubscription" class="space-y-4">
          <h3 class="text-lg font-semibold font-display">{{ $t('dashboard.settings.billing.upgrade') }}</h3>

          <Motion
            :variants="{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
            }"
            initial="hidden"
            animate="visible"
            :transition="staggerContainerTransition"
            class="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <Motion
              v-for="(tier, index) in paidTiers"
              :key="tier.id"
              :variants="staggerChildren"
              :custom="index"
            >
              <div class="border border-default rounded-sm p-6 hover:border-primary transition-colors duration-150 h-full flex flex-col">
                <div class="mb-4">
                  <h4 class="font-semibold font-display">{{ tier.title }}</h4>
                  <p class="text-sm text-muted mt-1">{{ tier.description }}</p>
                </div>

                <div class="mb-4">
                  <span class="text-2xl font-bold font-display">
                    {{ isYearly === '1' ? tier.price.yearly : tier.price.monthly }}
                  </span>
                  <span v-if="tier.billingCycle" class="text-sm text-muted">
                    {{ isYearly === '1' ? '/year' : tier.billingCycle }}
                  </span>
                </div>

                <ul class="space-y-2 mb-6 flex-1">
                  <li v-for="feature in tier.features" :key="feature" class="flex items-start gap-2 text-sm">
                    <UIcon name="i-heroicons-check" class="text-success mt-0.5 shrink-0" />
                    <span>{{ feature }}</span>
                  </li>
                </ul>

                <Motion :while-press="{ scale: 0.98 }" :transition="{ duration: 0.1 }">
                  <UButton
                    :label="$t('dashboard.settings.billing.upgrade')"
                    :color="tier.scale ? 'primary' : 'black'"
                    variant="solid"
                    block
                    class="rounded-sm"
                    :loading="loading"
                    @click="handleUpgrade(tier.id)"
                  />
                </Motion>
              </div>
            </Motion>
          </Motion>
        </div>
      </div>
    </Motion>
  </div>
</template>
