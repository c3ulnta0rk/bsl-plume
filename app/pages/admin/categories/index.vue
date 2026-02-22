<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t } = useI18n()
const categoryTypesStore = useCategoryTypesStore()
await categoryTypesStore.fetchAll()

const { items, loading, fetchAll } = useAdminCrud<{
  id: string
  tournamentId: string
  categoryTypeId: string
  maxTeams: number | null
  status: string
  createdAt: string
}>('categories')

await fetchAll()

const columns = computed(() => [
  { accessorKey: 'categoryTypeId', header: t('categories.fields.type') },
  { accessorKey: 'maxTeams', header: t('categories.fields.maxTeams') },
  { accessorKey: 'status', header: t('categories.fields.status') }
])
</script>

<template>
  <div>
    <AdminPageHeader :title="t('categories.title')" />

    <AdminDataTable
      :rows="items"
      :columns="columns"
      :loading="loading"
      @edit="(item) => navigateTo(`/admin/categories/${item.id}`)"
    >
      <template #cell-categoryTypeId="{ row }">
        {{ categoryTypesStore.items.find(ct => ct.id === String(row.categoryTypeId))?.name ?? '-' }}
      </template>
      <template #cell-status="{ row }">
        <AdminStatusBadge :status="String(row.status ?? '')" />
      </template>
    </AdminDataTable>
  </div>
</template>
