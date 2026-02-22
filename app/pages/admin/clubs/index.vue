<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t } = useI18n()
const { isAdmin } = useAdminAuth()
const { items, loading, fetchAll, create, update, remove } = useAdminCrud<{
  id: string
  name: string
  createdAt: string
}>('clubs')

await fetchAll()

const showModal = ref(false)
const showDelete = ref(false)
const editingId = ref<string | null>(null)
const form = ref({ name: '' })
const deleteTarget = ref<{ id: string, name: string } | null>(null)
const saving = ref(false)

function openCreate() {
  editingId.value = null
  form.value = { name: '' }
  showModal.value = true
}

function openEdit(item: Record<string, unknown> & { id: string }) {
  editingId.value = item.id
  form.value = { name: String(item.name ?? '') }
  showModal.value = true
}

function openDelete(item: Record<string, unknown> & { id: string }) {
  deleteTarget.value = { id: item.id, name: String(item.name ?? '') }
  showDelete.value = true
}

async function onSubmit() {
  saving.value = true
  try {
    if (editingId.value) {
      await update(editingId.value, form.value)
    } else {
      await create(form.value)
    }
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
  { accessorKey: 'name', header: t('clubs.fields.name') },
  { accessorKey: 'createdAt', header: t('common.date') }
])
</script>

<template>
  <div>
    <AdminPageHeader
      :title="t('clubs.title')"
      :action-label="t('clubs.create')"
      action-icon="i-lucide-plus"
      :show-action="isAdmin"
      @action="openCreate"
    />

    <AdminDataTable
      :rows="items"
      :columns="columns"
      :loading="loading"
      @edit="openEdit"
      @delete="openDelete"
    >
      <template #cell-createdAt="{ row }">
        {{ new Date(String(row.createdAt)).toLocaleDateString() }}
      </template>
    </AdminDataTable>

    <AdminFormModal
      v-model:open="showModal"
      :title="editingId ? t('clubs.edit') : t('clubs.create')"
      :loading="saving"
      @submit="onSubmit"
    >
      <UFormField
        :label="t('clubs.fields.name')"
        required
      >
        <UInput
          v-model="form.name"
          class="w-full"
        />
      </UFormField>
    </AdminFormModal>

    <AdminDeleteConfirm
      v-model:open="showDelete"
      :message="t('clubs.deleteConfirm')"
      :loading="saving"
      @confirm="onDelete"
    />
  </div>
</template>
