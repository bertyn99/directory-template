
interface City {
  id: number
  name: string
  slug: string
}

export const useCitySearch = () => {
  const loading = ref(false)

  const searchCities = async (q: string) => {
    loading.value = true
    try {
      const data = await $fetch<City[]>('/api/cities', {
        query: { search: q.length > 0 ? q : null, limit: 12 }
      })
      // Ensure we return an array, API might return object depending on implementation
      // Based on server/api/cities/index.ts, it returns the result of the query directly which is an array of objects.
      return data ?? []
    } catch (e) {
        console.error('Error searching cities:', e)
        return []
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    searchCities
  }
}
