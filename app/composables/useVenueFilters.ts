import { ref, computed, onMounted } from "vue";
interface CountryOption {
  name: string
  slug: string
  code?: string
}

interface CountriesResponse {
  countries?: CountryOption[]
}

export const useVenueFilters = (
  router: ReturnType<typeof useRouter>,
  route: ReturnType<typeof useRoute>,
) => {
  const localePath = useLocalePath()
  const routeQuery = computed(() => route.query ?? null);

  const currentPage = ref(routeQuery.value?.page ? Number(routeQuery.value.page) : 1);
  const searchName = ref<string>(
    (routeQuery.value?.search as string) ?? ""
  );
  const selectedCountry = ref<{ name: string; slug: string; code?: string } | null>(
    null
  );
  const selectedCity = ref<{ name: string; slug: string } | null>(
    null
  );
  // Parse English canonical slugs from URL (e.g. ?activities=kickboxing,muay-thai)
  const selectedActivities = ref<{ id: number; name: string; slug: string }[]>(
    routeQuery.value?.activities
      ? (routeQuery.value.activities as string)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((slug) => ({ id: 0, name: slug, slug }))
      : []
  );
  const { locale } = useI18n()

  onMounted(() => {
    if (routeQuery.value?.country) {
      const countryCode = routeQuery.value.country as string;
      $fetch<CountriesResponse>('/api/countries', { query: {} })
        .then((data) => {
          const country = data.countries?.find((c) => c.code?.toUpperCase() === countryCode.toUpperCase());
          if (country) {
            selectedCountry.value = {
              name: country.name,
              slug: country.slug,
              code: country.code,
            };
          }
        })
        .catch(() => {
          // Ignore fetch errors
        });
    }

    // Hydrate activity labels from catalog-backed categories API (match by slug)
    if (selectedActivities.value.length) {
      const selectedSlugs = new Set(selectedActivities.value.map((a) => a.slug));
      $fetch<{ data: { id: number; name: string; slug: string }[] }>('/api/categories', {
        query: { locale: locale.value },
      })
        .then((data) => {
          const bySlug = new Map((data.data ?? []).map((s) => [s.slug, s]));
          selectedActivities.value = selectedActivities.value.map((selected) => {
              const match = bySlug.get(selected.slug);
              return match
                ? { id: match.id, name: match.name, slug: match.slug }
                : selected;
            })
            .filter((a) => selectedSlugs.has(a.slug));
        })
        .catch(() => {
          // Ignore fetch errors
        });
    }
  });

  const applyFilters = async () => {
    const query: Record<string, string | number> = {};
    if (searchName.value) query.search = searchName.value;
    if (selectedCountry.value?.code) query.country = selectedCountry.value.code;
    if (selectedCity.value?.slug) query.city = selectedCity.value.slug;
    if (selectedActivities.value.length) query.activities = selectedActivities.value.map(a => a.slug).join(",");
    if (currentPage.value > 1) query.page = currentPage.value;

    router.push({ path: localePath('/venues'), query });
  };

  const resetFilters = async () => {
    searchName.value = "";
    selectedActivities.value = [];
    selectedCity.value = null;
    selectedCountry.value = null;
    currentPage.value = 1;
    applyFilters();
  };

  const updatePage = (newPage: number) => {
    currentPage.value = newPage;
    applyFilters();
  };

  return {
    currentPage,
    searchName,
    selectedCountry,
    selectedCity,
    selectedActivities,
    routeQuery,
    applyFilters,
    resetFilters,
    updatePage,
  };
};
