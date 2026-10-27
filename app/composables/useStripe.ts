// app/composables/useStripe.ts
import { directoryConfig } from "~~/directory.config";

export function useStripe() {
  const loading = ref(false);
  const { user } = useUserSession();
  const { locale } = useI18n();
  const analytics = useAnalytics();
  const isYearly = ref("0");
  const { csrf } = useCsrf();
  const items = ref([
    {
      label: "Monthly",
      value: "0",
    },
    {
      label: "Yearly",
      value: "1",
    },
  ]);

  const checkout = async (lookupKey: string) => {
    // construct the key to use with stripe
    const billingCycle =
      items.value.find((elm) => elm.value === isYearly.value)?.label?.toLocaleLowerCase() ??
      "monthly";
    console.log(billingCycle);

    // Track checkout started
    analytics.subscription.checkoutStarted(lookupKey, billingCycle as "monthly" | "yearly");

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

  // Fallback pricing table (used if the pricing API fails or returns nothing).
  // Plan ids, titles, prices, descriptions and features come from
  // directory.config.ts (billing) — the same ids the Stripe products must use,
  // so the checkout() lookup keys `${id}_${billingCycle}` always match a real
  // Stripe price. The free tier is static engine copy: it never reaches
  // checkout (guarded by tier.id !== "tier-free" below) and exists only to
  // render the visitor card.
  const freeTier = {
    title: "Visitor",
    id: "tier-free",
    description: "Search and discover venues",
    price: {
      monthly: "Free",
      yearly: "Free",
    },
    features: [
      "Search venues by location",
      "View venue profiles",
      "Browse activities and schedules",
      "Read reviews",
    ],
    button: {
      label: "Get Started",
      to: "/dashboard",
    },
  };

  const formatPrice = (amount: number) => `$${amount}`;

  const fallbackTiers = [
    freeTier,
    ...directoryConfig.billing.plans.map((plan) => ({
      title: plan.title,
      id: plan.id,
      description: plan.description,
      price: {
        monthly: formatPrice(plan.monthly),
        yearly: formatPrice(plan.yearly),
      },
      billingCycle: "/month",
      // highlight ⇒ the emphasized card: badge + primary CTA (same pair the
      // former hardcoded "Most Popular"/scale entries produced).
      ...(plan.highlight && { badge: "Most Popular", scale: true }),
      features: [...plan.features],
      // The label below is never rendered for paid tiers — the `plans`
      // computed overrides it with the auth-state CTA ("Buy Now"/…), exactly
      // like it does for API-provided tiers.
      button: {
        label: plan.title,
      },
    })),
  ];

  // Fetch pricing from API
  const fetchPricing = async () => {
    try {
      const data = await useRequestFetch()<
        Array<{
          title: string;
          description: string;
          highlight?: boolean;
          scale?: boolean;
          features: string[];
          prices: Array<{
            interval: string;
            amount: string;
            // Never read by the tier transform; shape owned by the (untyped) pricing API
            dbPrice: unknown;
          }>;
        }>
      >(`/api/pricing?locale=${locale.value}`);

      if (!data || data.length === 0) {
        return fallbackTiers;
      }

      // Transform API response to tier structure
      const transformedTiers = data.map((plan, _index) => {
        const id = `tier-${plan.title.toLowerCase().replace(/\s+/g, "-")}`;

        // Extract monthly and yearly prices
        let monthlyPrice = "Free";
        let yearlyPrice = "Free";

        plan.prices.forEach((price) => {
          if (price.interval === "month") {
            monthlyPrice = price.amount;
          }
          if (price.interval === "year") {
            yearlyPrice = price.amount;
          }
        });

        return {
          title: plan.title,
          id,
          description: plan.description,
          price: {
            monthly: monthlyPrice,
            yearly: yearlyPrice,
          },
          ...(plan.highlight && { highlight: true }),
          ...(plan.scale && { scale: true }),
          billingCycle: "/month",
          features: plan.features || [],
          button: {
            label: plan.title,
          },
        };
      });

      // Check if first plan is already free (has 0€ or $0 price for monthly)
      const firstPlanPrice = transformedTiers.length > 0 ? transformedTiers[0].price.monthly : null;
      // Match 'Free' or prices that contain '0' (like $0 or 0€)
      const firstPlanIsFree =
        firstPlanPrice === "Free" || (firstPlanPrice && /0/.test(firstPlanPrice));

      // Only prepend fallback free tier if there's no free plan in the response
      return firstPlanIsFree ? transformedTiers : [fallbackTiers[0], ...transformedTiers];
    } catch (error) {
      console.error("Failed to fetch pricing from API:", error);
      return fallbackTiers;
    }
  };

  // Fetch pricing data reactively
  const { data: pricingData, refresh: refreshPricing } = useAsyncData(
    "stripe-pricing",
    fetchPricing,
    {
      default: () => fallbackTiers,
      watch: [locale],
    },
  );

  const tiers = computed(() => pricingData.value || fallbackTiers);

  const plans = computed(() => {
    const getText = () => {
      if (user.value?.hasPaidSubscription) return "Manage Subscription";
      else if (user.value) return "Buy Now";
      else return "Sign In to Buy";
    };

    return tiers.value.map((tier) => {
      const updatedTier = {
        ...tier,
        button: {
          ...tier.button,
          label: tier.id !== "tier-free" ? getText() : tier.button.label,
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
    refreshPricing,
  };
}
