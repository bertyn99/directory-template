<script setup lang="ts">
/**
 * Affiliate gear kit — renders the sample kit from directory.config.ts
 * (affiliates.kit), whatever it contains. MDC usage (kept intact):
 *   ::equipment-kit{sport="…"}        → config kit, `sport` = click attribution
 *   ::equipment-kit{items="id1,id2"}  → explicit product-id override
 */
import { localizedCopy, partnerLabel } from "~~/shared/affiliates";

const props = withDefaults(defineProps<{
  /** Category slug — no longer selects the kit, only tags the click (subid). */
  sport?: string
  title?: string
  partner?: string
  items?: string | string[]
  bare?: boolean
}>(), {
  sport: "",
  title: "",
  partner: "",
  items: undefined,
  bare: false,
});

const { t, locale } = useI18n();
const { kitForSport, productLink, parsePartner } = useAffiliate();

/** Per-category click attribution: Rakuten u1 / Awin clickref. */
const subid = computed(() =>
  props.sport ? { slot: props.sport, placement: "guide-kit" } : undefined,
);

const productIds = computed(() => {
  if (!props.items) {
    return [];
  }
  if (Array.isArray(props.items)) {
    return props.items.filter(Boolean);
  }
  return props.items
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
});

const cards = computed(() => {
  const override = parsePartner(props.partner);
  const toCard = (link: NonNullable<ReturnType<typeof productLink>>) => ({
    product: link.product,
    href: link.href,
    partner: link.partner,
    // Gating invariant: an unavailable partner empties its href — the button
    // (and a card with nothing left to click) stays hidden.
    alts: link.alts.filter((alt) => alt.href).slice(0, 2),
  });
  if (productIds.value.length > 0) {
    return productIds.value.flatMap((id) => {
      const link = productLink(id, override, subid.value);
      if (!link) {
        return [];
      }
      const card = toCard(link);
      if (!card.href && card.alts.length === 0) {
        return [];
      }
      return [card];
    });
  }
  if (!props.sport) {
    return [];
  }
  return kitForSport(props.sport, subid.value).flatMap((card) => {
    if (!override) {
      return card.href || card.alts.length > 0 ? [card] : [];
    }
    const link = productLink(card.product.id, override, subid.value);
    if (!link) {
      return [card];
    }
    const overridden = toCard(link);
    if (!overridden.href && overridden.alts.length === 0) {
      return card.href || card.alts.length > 0 ? [card] : [];
    }
    return [overridden];
  });
});

const heading = computed(() => {
  if (props.title) {
    return props.title;
  }
  return t("affiliate.kitTitle");
});
</script>

<template>
  <aside v-if="cards.length" class="not-prose my-8">
    <div class="border border-default bg-muted rounded-sm">
      <div
        v-if="!bare"
        class="px-4 py-3 sm:px-5 border-b border-default flex flex-col gap-1"
      >
        <p class="font-display text-lg font-bold uppercase tracking-wide text-default">
          {{ heading }}
        </p>
        <p class="text-xs text-muted">
          {{ t("affiliate.disclosure") }}
        </p>
      </div>
      <div class="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AffiliateProductCard
          v-for="card in cards"
          :key="card.product.id"
          :name="localizedCopy(card.product.names, locale)"
          :blurb="localizedCopy(card.product.blurbs, locale)"
          :icon="card.product.icon"
          :href="card.href"
          :partner="card.partner"
          :cta="t(card.product.ctaKey)"
          :alts="card.alts.map((alt) => ({
            href: alt.href,
            partner: alt.partner,
            cta: t('affiliate.alsoOn', { partner: partnerLabel(alt.partner) }),
          }))"
        />
      </div>
      <p v-if="bare" class="px-4 pb-4 sm:px-5 text-xs text-muted">
        {{ t("affiliate.disclosure") }}
      </p>
    </div>
  </aside>
</template>
