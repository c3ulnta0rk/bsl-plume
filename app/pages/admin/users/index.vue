<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t } = useI18n()
const { isAdmin } = useAdminAuth()
const { items, loading, fetchAll, update, remove } = useAdminCrud<{
  id: string
  email: string
  name: string
  role: string
  clubId: string | null
  licenseNumber: string | null
  createdAt: string
}>('users')

await fetchAll()

const showDelete = ref(false)
const deleteTarget = ref<{ id: string, name: string } | null>(null)
const saving = ref(false)

function openDelete(item: Record<string, unknown> & { id: string }) {
  deleteTarget.value = { id: item.id, name: String(item.name ?? '') }
  showDelete.value = true
}

async function toggleRole(item: { id: string, role: string }) {
  if (!isAdmin.value) return
  const newRole = item.role === 'admin' ? 'user' : 'admin'
  await update(item.id, { role: newRole })
  await fetchAll()
}

async function onDelete() {
  if (!deleteTarget.value) return
  saving.value = true
  try {
    await remove(deleteTarget.value.id)
    showDelete.value = false
    deleteTarget.value = null
    await fetchAll()
  } finally {
    saving.value = false
  }
}

const columns = computed(() => [
  { accessorKey: 'name', header: t('users.fields.name'), filter: { type: 'text' as const } },
  { accessorKey: 'email', header: t('users.fields.email'), filter: { type: 'text' as const } },
  {
    accessorKey: 'role',
    header: t('users.fields.role'),
    filter: {
      type: 'select' as const,
      options: [
        { label: t('users.roles.admin'), value: 'admin' },
        { label: t('users.roles.user'), value: 'user' }
      ]
    }
  },
  { accessorKey: 'licenseNumber', header: t('users.fields.licenseNumber') }
])
</script>

<template>
  <div>
    <AdminPageHeader :title="t('users.title')" />

    <AdminDataTable
      :rows="items"
      :columns="columns"
      :loading="loading"
      @edit="(item) => navigateTo(`/admin/users/${item.id}`)"
      @delete="openDelete"
    >
      <template #cell-role="{ row }">
        <UBadge
          :color="(row as Record<string, unknown>).role === 'admin' ? 'primary' : 'neutral'"
          variant="subtle"
          size="sm"
          class="cursor-pointer"
          @click="isAdmin && toggleRole(row as { id: string, role: string })"
        >
          {{ t(`users.roles.${(row as Record<string, unknown>).role}`) }}
        </UBadge>
      </template>
    </AdminDataTable>

    <AdminDeleteConfirm
      v-model:open="showDelete"
      :message="t('users.deleteConfirm')"
      :loading="saving"
      @confirm="onDelete"
    />
  </div>
</template>
