interface UserItem {
  id: string
  email: string
  name: string
  role: string
  clubId: string | null
  licenseNumber: string | null
  createdAt: string
}

export const useUsersStore = defineStore('users', () => {
  const items = ref<UserItem[]>([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      items.value = await $fetch<UserItem[]>('/api/admin/users')
    } finally {
      loading.value = false
    }
  }

  return { items, loading, fetchAll }
})
