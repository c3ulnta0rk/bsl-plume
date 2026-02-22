interface Club {
  id: string
  name: string
  createdAt: string
}

export const useClubsStore = defineStore('clubs', () => {
  const items = ref<Club[]>([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      items.value = await $fetch<Club[]>('/api/admin/clubs')
    } finally {
      loading.value = false
    }
  }

  return { items, loading, fetchAll }
})
