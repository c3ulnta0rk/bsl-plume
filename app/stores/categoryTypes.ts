interface CategoryType {
  id: string
  name: string
  type: string
  gender: string | null
}

export const useCategoryTypesStore = defineStore('categoryTypes', () => {
  const items = ref<CategoryType[]>([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      items.value = await $fetch<CategoryType[]>('/api/admin/category-types')
    } finally {
      loading.value = false
    }
  }

  return { items, loading, fetchAll }
})
