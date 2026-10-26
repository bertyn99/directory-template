<script setup lang="ts">
import { AFFILIATE_REL, localizedCopy, partnerLabel } from "~~/shared/affiliates";

const props = withDefaults(defineProps<{
  product?: string
  partner?: string
  title?: string
}>(), {
  product: "creatine",
  partner: "",
  title: "",
});

const { t, locale } = useI18n();
const { nutritionFor } = useAffiliate();

const pick = computed(() => nutritionFor(props.product, props.partner));

const heading = computed(() => {
  if (props.title) {
    return props.title;
  }
  if (!pick.value) {
    return t("affiliate.nutritionTitle");
  }
  return localizedCopy(pick.value.product.names, locale.value);
});
</script>

<template>
  <aside v-if="pick" class="not-prose my-8">
    <div
      class="border border-default border-l-4 border-l-primary bg-muted rounded-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
    >
      <div class="flex items-start gap-3 min-w-0 flex-1">
        <UIcon :name="pick.product.icon" class="w-10 h-10 text-primary shrink-0" />
        <div class="space-y-1 min-w-0">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            {{ t("affiliate.nutritionEyebrow") }}
          </p>
          <p class="font-display text-lg font-bold uppercase tracking-wide text-default">
            {{ heading }}
          </p>
          <p class="text-sm text-muted leading-relaxed">
            {{ localizedCopy(pick.product.blurbs, locale) }}
          </p>
          <p class="text-xs text-muted">
            {{ t("affiliate.disclosure") }}
            · {{ partnerLabel(pick.partner) }}
          </p>
        </div>
      </div>
      <UButton
        :to="pick.href"
        :label="t('affiliate.shopCta')"
        color="primary"
        variant="solid"
        class="rounded-sm shrink-0"
        target="_blank"
        external
        :rel="AFFILIATE_REL"
        trailing-icon="i-heroicons-arrow-top-right-on-square"
      />
    </div>
  </aside>
</template>
