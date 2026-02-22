interface Tournament {
  id: string
  name: string
  clubId: string
  date: string | null
  location: string | null
  status: string
  createdAt: string
}

export const useTournamentsStore = defineStore('tournaments', () => {
  const items = ref<Tournament[]>([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      items.value = await $fetch<Tournament[]>('/api/admin/tournaments')
    } finally {
      loading.value = false
    }
  }

  return { items, loading, fetchAll }
})
