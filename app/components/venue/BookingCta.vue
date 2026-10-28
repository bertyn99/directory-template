<script setup lang="ts">
/**
 * Venue-detail outbound booking CTA (venues.booking_url / booking_partner).
 *
 * Partner resolution (directoryConfig.booking.partners):
 * 1. a partner whose `id` equals the venue's bookingPartner — else
 * 2. host-suffix match of bookingUrl against partners[].hosts.
 *
 * A matched partner supplies the CTA label (localized, fr-fallback) and,
 * when `sponsored`, the affiliate-grade rel + disclosure line; an unmatched
 * URL renders a plain outbound link (rel="noopener"). No bookingUrl ⇒ the
 * component renders NOTHING (unconfigured ⇒ hidden, template invariant).
 */
import { directoryConfig, type BookingPartnerConfig } from "~~/directory.config";
import { localizedCopy } from "~~/shared/affiliates";

const props = withDefaults(defineProps<{
  /** Venue booking deep-link (venues.booking_url). Absent ⇒ nothing renders. */
  bookingUrl?: string | null
  /** Optional partner id (venues.booking_partner) — resolved first, then host match. */
  bookingPartner?: string | null
  /**
   * Partner registry override — directoryConfig.booking.partners by default.
   * Test seam only: the shipped config has no partners until instantiated.
   */
  partners?: readonly BookingPartnerConfig[]
}>(), {
  bookingUrl: undefined,
  bookingPartner: undefined,
  partners: undefined,
});

const { t, locale } = useI18n();

/** Host suffix match: "playtomic.com" matches itself and any subdomain. */
function hostMatches(host: string, configuredHosts: readonly string[]): boolean {
  const bare = (value: string) => value.toLowerCase().replace(/^www\./, "");
  const target = bare(host);
  return configuredHosts.some((configured) => {
    const candidate = bare(configured);
    return target === candidate || target.endsWith(`.${candidate}`);
  });
}

const resolvedPartner = computed<BookingPartnerConfig | undefined>(() => {
  const registry = props.partners ?? directoryConfig.booking.partners;
  if (!props.bookingUrl || registry.length === 0) {
    return undefined;
  }
  if (props.bookingPartner) {
    const byId = registry.find((partner) => partner.id === props.bookingPartner);
    if (byId) {
      return byId;
    }
  }
  let host: string;
  try {
    host = new URL(props.bookingUrl).hostname;
  } catch {
    // Unparseable URL — treat as unmatched (plain outbound).
    return undefined;
  }
  return registry.find((partner) => hostMatches(host, partner.hosts));
});

const sponsored = computed(() => resolvedPartner.value?.sponsored === true);

/** Sponsored partner ⇒ affiliate-grade rel; plain outbound otherwise. */
const rel = computed(() =>
  sponsored.value ? "sponsored noopener noreferrer" : "noopener",
);

/** Partner label (localized) wins; i18n default is the fallback. */
const label = computed(() =>
  resolvedPartner.value
    ? localizedCopy(resolvedPartner.value.label, locale.value)
    : t("venues.bookingCta"),
);
</script>

<template>
  <div v-if="bookingUrl" class="flex flex-col items-start gap-1">
    <UButton
      :href="bookingUrl"
      target="_blank"
      :rel="rel"
      color="primary"
      class="rounded-sm uppercase tracking-wide"
      icon="i-lucide-calendar-check"
      trailing-icon="i-lucide-external-link"
    >
      {{ label }}
    </UButton>
    <p v-if="sponsored" class="text-xs text-muted">
      {{ t("affiliate.disclosure") }}
    </p>
  </div>
</template>
