import { ref, computed, onMounted } from "vue";
interface CountryOption {
  name: string
  slug: string
  code?: string
}

interface CountriesResponse {
  countries?: CountryOption[]
}

/** `?facet=key:value` (string or repeated array) → key→value map. */
function parseFacetQuery(raw: unknown): Record<string, string> {
  const entries = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const map: Record<string, string> = {};
  for (const entry of entries) {
    if (typeof entry !== "string") continue;
    const separator = entry.indexOf(":");
    if (separator <= 0) continue;
    map[entry.slice(0, separator)] = entry.slice(separator + 1);
  }
  return map;
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
  // Facet filters from URL (?facet=key:value&facet=…) → key→value map
  // ("true" for booleans, enum value otherwise). Values are validated
  // server-side against taxonomy.facets — unknown ones just yield no results.
  const selectedFacets = ref<Record<string, string>>(parseFacetQuery(routeQuery.value?.facet));
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
    const query: Record<string, string | number | string[]> = {};
    if (searchName.value) query.search = searchName.value;
    if (selectedCountry.value?.code) query.country = selectedCountry.value.code;
    if (selectedCity.value?.slug) query.city = selectedCity.value.slug;
    if (selectedActivities.value.length) query.activities = selectedActivities.value.map(a => a.slug).join(",");
    const facetEntries = Object.entries(selectedFacets.value);
    if (facetEntries.length) query.facet = facetEntries.map(([key, value]) => `${key}:${value}`);
    if (currentPage.value > 1) query.page = currentPage.value;

    router.push({ path: localePath('/venues'), query });
  };

  const resetFilters = async () => {
    searchName.value = "";
    selectedActivities.value = [];
    selectedCity.value = null;
    selectedCountry.value = null;
    selectedFacets.value = {};
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
    selectedFacets,
    routeQuery,
    applyFilters,
    resetFilters,
    updatePage,
  };
};
