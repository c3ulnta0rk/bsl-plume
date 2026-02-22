<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t } = useI18n()
const { isAdmin } = useAdminAuth()
const clubsStore = useClubsStore()
await clubsStore.fetchAll()

const { items, loading, fetchAll, create, remove } = useAdminCrud<{
  id: string
  name: string
  clubId: string
  date: string | null
  location: string | null
  status: string
  createdAt: string
}>('tournaments')

await fetchAll()

const showModal = ref(false)
const showDelete = ref(false)
const form = ref({ name: '', clubId: '', date: '', location: '', status: 'draft' })
const deleteTarget = ref<{ id: string, name: string } | null>(null)
const saving = ref(false)

function openCreate() {
  form.value = { name: '', clubId: '', date: '', location: '', status: 'draft' }
  showModal.value = true
}

function openDelete(item: Record<string, unknown> & { id: string }) {
  deleteTarget.value = { id: item.id, name: String(item.name ?? '') }
  showDelete.value = true
}

async function onSubmit() {
  saving.value = true
  try {
    await create(form.value)
    showModal.value = false
    await fetchAll()
  } finally {
    saving.value = false
  }
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
  { accessorKey: 'name', header: t('tournaments.fields.name'), filter: { type: 'text' as const } },
  { accessorKey: 'location', header: t('tournaments.fields.location'), filter: { type: 'text' as const } },
  {
    accessorKey: 'status',
    header: t('tournaments.fields.status'),
    filter: {
      type: 'select' as const,
      options: statusOptions
    }
  },
  { accessorKey: 'date', header: t('tournaments.fields.date') }
])

const statusOptions = ['draft', 'published', 'archived'].map(s => ({
  label: t(`tournaments.statuses.${s}`), value: s
}))
</script>

<template>
  <div>
    <AdminPageHeader
      :title="t('tournaments.title')"
      :action-label="t('tournaments.create')"
      action-icon="i-lucide-plus"
      :show-action="isAdmin"
      @action="openCreate"
    />

    <AdminDataTable
      :rows="items"
      :columns="columns"
      :loading="loading"
      @edit="(item) => navigateTo(`/admin/tournaments/${item.id}`)"
      @delete="openDelete"
    >
      <template #cell-status="{ row }">
        <AdminStatusBadge :status="String(row.status ?? '')" />
      </template>
      <template #cell-date="{ row }">
        {{ row.date ? new Date(String(row.date)).toLocaleDateString() : '-' }}
      </template>
    </AdminDataTable>

    <AdminFormModal
      v-model:open="showModal"
      :title="t('tournaments.create')"
      :loading="saving"
      @submit="onSubmit"
    >
      <UFormField
        :label="t('tournaments.fields.name')"
        required
      >
        <UInput
          v-model="form.name"
          class="w-full"
        />
      </UFormField>
      <UFormField
        :label="t('tournaments.fields.club')"
        required
      >
        <USelect
          v-model="form.clubId"
          :items="clubsStore.items.map(c => ({ label: c.name, value: c.id }))"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="t('tournaments.fields.date')">
        <UInput
          v-model="form.date"
          type="date"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="t('tournaments.fields.location')">
        <UInput
          v-model="form.location"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="t('tournaments.fields.status')">
        <USelect
          v-model="form.status"
          :items="statusOptions"
          class="w-full"
        />
      </UFormField>
    </AdminFormModal>

    <AdminDeleteConfirm
      v-model:open="showDelete"
      :message="t('tournaments.deleteConfirm')"
      :loading="saving"
      @confirm="onDelete"
    />
  </div>
</template>
