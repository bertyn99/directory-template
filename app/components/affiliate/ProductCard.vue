<script setup lang="ts">
import { AFFILIATE_REL, partnerLabel, type AffiliatePartner } from "~~/shared/affiliates";

const { name, blurb, icon, href, partner, cta, altHref, altPartner, altCta } = withDefaults(defineProps<{
  name: string
  blurb: string
  icon: string
  href: string
  partner: AffiliatePartner
  cta: string
  /** Optional secondary partner (e.g. Decathlon) shown as an outline button. */
  altHref?: string
  altPartner?: AffiliatePartner
  altCta?: string
}>(), {
  altHref: undefined,
  altPartner: undefined,
  altCta: undefined,
})
</script>

<template>
  <UCard
    class="h-full border border-default bg-default rounded-sm hover:border-primary transition-colors duration-150"
    :ui="{ root: 'rounded-sm', body: 'p-4 sm:p-5' }"
  >
    <div class="flex flex-col h-full gap-4">
      <div class="flex items-start gap-3">
        <UIcon :name="icon" class="w-8 h-8 text-primary shrink-0" />
        <div class="min-w-0 space-y-1">
          <p class="font-display text-sm font-bold uppercase tracking-wide text-default">
            {{ name }}
          </p>
          <p class="text-sm text-muted leading-relaxed">
            {{ blurb }}
          </p>
        </div>
      </div>
      <div class="mt-auto flex flex-col gap-2">
        <div class="flex flex-wrap gap-2">
          <UBadge
            color="neutral"
            variant="outline"
            size="xs"
            class="rounded-sm uppercase tracking-wide"
          >
            {{ partnerLabel(partner) }}
          </UBadge>
          <UBadge
            v-if="altHref && altPartner"
            color="neutral"
            variant="outline"
            size="xs"
            class="rounded-sm uppercase tracking-wide"
          >
            {{ partnerLabel(altPartner) }}
          </UBadge>
        </div>
        <div class="grid gap-2 sm:grid-cols-2">
          <UButton
            :to="href"
            :label="cta"
            color="primary"
            variant="solid"
            size="sm"
            block
            class="rounded-sm"
            target="_blank"
            external
            :rel="AFFILIATE_REL"
            trailing-icon="i-heroicons-arrow-top-right-on-square"
          />
          <UButton
            v-if="altHref && altPartner"
            :to="altHref"
            :label="altCta ?? partnerLabel(altPartner)"
            color="neutral"
            variant="outline"
            size="sm"
            block
            class="rounded-sm"
            target="_blank"
            external
            :rel="AFFILIATE_REL"
          />
        </div>
      </div>
    </div>
  </UCard>
</template>
