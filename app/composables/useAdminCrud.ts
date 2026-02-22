interface HasId {
  id: string
}

export function useAdminCrud<T extends HasId>(entityPath: string) {
  const items = ref<T[]>([]) as Ref<T[]>
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      items.value = await $fetch<T[]>(`/api/admin/${entityPath}`)
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      error.value = err?.data?.message ?? 'Fetch failed'
    } finally {
      loading.value = false
    }
  }

  async function fetchById(id: string) {
    return await $fetch<T>(`/api/admin/${entityPath}/${id}`)
  }

  async function create(data: Partial<T>) {
    return await $fetch<T>(`/api/admin/${entityPath}`, {
      method: 'POST',
      body: data
    })
  }

  async function update(id: string, data: Partial<T>) {
    return await $fetch<T>(`/api/admin/${entityPath}/${id}`, {
      method: 'PUT',
      body: data
    })
  }

  async function remove(id: string) {
    return await $fetch<T>(`/api/admin/${entityPath}/${id}`, {
      method: 'DELETE'
    })
  }

  return {
    items,
    loading,
    error,
    fetchAll,
    fetchById,
    create,
    update,
    remove
  }
}
