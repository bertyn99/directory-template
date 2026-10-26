<script setup lang="ts">
/**
 * AdSense ad unit, styled for the neutral template design system.
 *
 * Renders NOTHING unless the AdSense client ID and the slot ID for its
 * `placement` are configured — same graceful-degradation pattern as the
 * affiliate Decathlon button: an unconfigured ad slot never ships to prod.
 *
 * The underlying adsbygoogle.js is loaded in first-party mode (bundled from
 * our domain, requests proxied + anonymised) — see scripts.registry in
 * nuxt.config.ts. Slot IDs come from ad units created in the AdSense dashboard.
 */
const props = defineProps<{
  /** Which slot from runtimeConfig.public.adsense.slots to render. */
  placement: 'home' | 'categoriesHub' | 'categoryDetail'
  /**
   * leaderboard — full-width banner between homepage sections.
   * card — grid card matching the categories-hub tiles.
   * inline — in-article fluid block inside category hub content.
   */
  variant?: 'leaderboard' | 'card' | 'inline'
}>()

const { t } = useI18n()
const config = useRuntimeConfig()

const client = computed(() => config.public.adsense.client)
const slotId = computed(() => config.public.adsense.slots[props.placement] ?? '')

// Reserve height before the ad fills — prevents layout shift (CLS) while the
// auction runs. The card variant stretches to the height of its grid row.
const variantClass = computed(() => ({
  leaderboard: 'min-h-[90px] md:min-h-[120px]',
  card: 'min-h-[220px] h-full',
  inline: 'min-h-[250px]',
})[props.variant ?? 'inline'])
</script>

<template>
    <aside
        v-if="client && slotId"
        class="overflow-hidden border rounded-sm bg-muted border-default"
        :aria-label="t('ads.label')"
    >
        <p class="px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted">
            {{ t('ads.label') }}
        </p>
        <div class="flex items-center justify-center px-4 pt-2 pb-4" :class="variantClass">
            <ScriptGoogleAdsense
                :data-ad-client="client"
                :data-ad-slot="slotId"
                :data-ad-format="variant === 'inline' ? 'fluid' : 'auto'"
                :data-ad-layout="variant === 'inline' ? 'in-article' : undefined"
                data-full-width-responsive="true"
            >
                <!-- Ad blocked: leave the reserved box, no nagging fallback -->
                <template #error />
            </ScriptGoogleAdsense>
        </div>
    </aside>
</template>
