// app/composables/useStripe.ts
import { directoryConfig } from "~~/directory.config";

/**
 * Stripe checkout composable.
 *
 * Pricing is CONFIG-DERIVED: plan ids, titles, display prices and features
 * come from directory.config.ts (billing) — the same ids the Stripe products
 * must use, so the checkout() lookup keys `${id}_${billingCycle}` always
 * match a real Stripe price. There is NO pricing API: the former
 * `/api/pricing` fetch was removed (the route never existed, so every
 * visitor silently used this table anyway).
 *
 * The free tier is static ENGINE copy (i18n `billing.*`): it never reaches
 * checkout (guarded by tier.id !== "tier-free" in `plans`) and exists only
 * to render the visitor card. The paid tiers' titles/descriptions/features
 * are config-owned per-niche marketing copy (not i18n).
 */
export function useStripe() {
  const loading = ref(false);
  const { user } = useUserSession();
  const { t, locale } = useI18n();
  const analytics = useAnalytics();
  const isYearly = ref("0");
  const { csrf } = useCsrf();

  // Billing-cycle toggle. Labels are i18n (`billing.cycle.*`); the checkout
  // lookup key derives from the VALUE ("0"/"1") — never from the translated
  // label — so Stripe lookup keys stay `*_monthly` / `*_yearly` everywhere.
  const items = computed(() => [
    {
      label: t("billing.cycle.monthly"),
      value: "0",
    },
    {
      label: t("billing.cycle.yearly"),
      value: "1",
    },
  ]);

  const checkout = async (lookupKey: string) => {
    // Construct the key to use with Stripe
    const billingCycle: "monthly" | "yearly" = isYearly.value === "1" ? "yearly" : "monthly";

    // Track checkout started
    analytics.subscription.checkoutStarted(lookupKey, billingCycle);

    loading.value = true;
    const res = await useRequestFetch()("/api/stripe/create-checkout-session", {
      method: "POST",
      body: {
        lookup_key: `${lookupKey}_${billingCycle}`,
      },
      headers: { "csrf-token": csrf },
    });

    loading.value = false;
    if (res) {
      await navigateTo(res.url, {
        external: true,
      });
    }
  };

  const navigateToStripeDashboard = async () => {
    loading.value = true;
    const res = await useRequestFetch()("/api/stripe/create-customer-portal-session", {
      method: "POST",
      headers: { "csrf-token": csrf },
    });

    loading.value = false;
    if (res && "url" in res) {
      await navigateTo(res.url, {
        external: true,
      });
    } else {
      console.error("Error creating portal session:", res.error);
    }
  };

  const getCurrentSubscription = async () => {
    loading.value = true;
    const res = await useRequestFetch()("/api/stripe/subscription");

    loading.value = false;
    return res;
  };

  // Locale-aware price formatting: ISO 4217 currency from the config,
  // display locale from i18n — 9.99 renders "9,99 €" (fr) / "€9.99" (en).
  const formatPrice = (amount: number) => {
    try {
      return new Intl.NumberFormat(locale.value, {
        style: "currency",
        currency: directoryConfig.billing.currency,
      }).format(amount);
    } catch {
      // A malformed currency code in the config must not crash the pricing
      // table — degrade to an amount + code suffix.
      return `${amount} ${directoryConfig.billing.currency}`;
    }
  };

  const tiers = computed(() => [
    {
      title: t("billing.free.title"),
      id: "tier-free",
      description: t("billing.free.description"),
      price: {
        monthly: t("billing.free.price"),
        yearly: t("billing.free.price"),
      },
      features: [
        t("billing.free.features.search"),
        t("billing.free.features.profiles"),
        t("billing.free.features.activities"),
        t("billing.free.features.reviews"),
      ],
      button: {
        label: t("billing.free.cta"),
        to: "/dashboard",
      },
    },
    ...directoryConfig.billing.plans.map((plan) => ({
      title: plan.title,
      id: plan.id,
      description: plan.description,
      price: {
        monthly: formatPrice(plan.monthly),
        yearly: formatPrice(plan.yearly),
      },
      // Cycle labels are i18n (`billing.cycle.*`) — consumers render the
      // label for the active cycle; no hardcoded "/month" string ships here.
      // highlight ⇒ the emphasized card: badge + primary CTA.
      ...(plan.highlight && { badge: t("billing.mostPopular"), scale: true }),
      features: [...plan.features],
      // The label below is never rendered for paid tiers — the `plans`
      // computed overrides it with the auth-state CTA ("Buy Now"/…).
      button: {
        label: plan.title,
      },
    })),
  ]);

  const plans = computed(() => {
    const ctaLabel = user.value?.hasPaidSubscription
      ? t("billing.manageSubscription")
      : user.value
        ? t("billing.buyNow")
        : t("billing.signInToBuy");

    return tiers.value.map((tier) => {
      const updatedTier = {
        ...tier,
        button: {
          ...tier.button,
          label: tier.id !== "tier-free" ? ctaLabel : tier.button.label,
          onClick:
            tier.id !== "tier-free"
              ? user.value?.hasPaidSubscription
                ? async () => navigateTo("/dashboard")
                : async () => await checkout(tier.id)
              : undefined,
        },
      };

      return updatedTier;
    });
  });

  return {
    checkout,
    navigateToStripeDashboard,
    getCurrentSubscription,
    plans,
    isYearly,
    items,
  };
}
