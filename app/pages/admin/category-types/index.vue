<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t } = useI18n()
const { isAdmin } = useAdminAuth()
const { items, loading, fetchAll, create, update, remove } = useAdminCrud<{
  id: string
  name: string
  type: string
  gender: string | null
}>('category-types')

await fetchAll()

const showModal = ref(false)
const showDelete = ref(false)
const editingId = ref<string | null>(null)
const form = ref({ name: '', type: 'singles', gender: 'M' as string | undefined })
const deleteTarget = ref<{ id: string } | null>(null)
const saving = ref(false)

function openCreate() {
  editingId.value = null
  form.value = { name: '', type: 'singles', gender: 'M' }
  showModal.value = true
}

function openEdit(item: Record<string, unknown> & { id: string }) {
  editingId.value = item.id
  form.value = { name: String(item.name ?? ''), type: String(item.type ?? 'singles'), gender: (item.gender as string | undefined) ?? undefined }
  showModal.value = true
}

function openDelete(item: { id: string }) {
  deleteTarget.value = item
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
  { accessorKey: 'name', header: t('categoryTypes.fields.name') },
  { accessorKey: 'type', header: t('categoryTypes.fields.type') },
  { accessorKey: 'gender', header: t('categoryTypes.fields.gender') }
])

const typeOptions = ['singles', 'doubles', 'mixed'].map(v => ({
  label: t(`categoryTypes.types.${v}`), value: v
}))

const genderOptions = [
  { label: t('categoryTypes.genders.M'), value: 'M' },
  { label: t('categoryTypes.genders.F'), value: 'F' },
  { label: t('categoryTypes.genders.mixed'), value: 'mixed' }
]
</script>

<template>
  <div>
    <AdminPageHeader
      :title="t('categoryTypes.title')"
      :action-label="t('categoryTypes.create')"
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
      <template #cell-type="{ row }">
        {{ t(`categoryTypes.types.${row.type}`) }}
      </template>
      <template #cell-gender="{ row }">
        {{ row.gender ? t(`categoryTypes.genders.${row.gender}`) : '-' }}
      </template>
    </AdminDataTable>

    <AdminFormModal
      v-model:open="showModal"
      :title="editingId ? t('categoryTypes.edit') : t('categoryTypes.create')"
      :loading="saving"
      @submit="onSubmit"
    >
      <UFormField
        :label="t('categoryTypes.fields.name')"
        required
      >
        <UInput
          v-model="form.name"
          class="w-full"
        />
      </UFormField>
      <UFormField
        :label="t('categoryTypes.fields.type')"
        required
      >
        <USelect
          v-model="form.type"
          :items="typeOptions"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="t('categoryTypes.fields.gender')">
        <USelect
          v-model="form.gender"
          :items="genderOptions"
          class="w-full"
        />
      </UFormField>
    </AdminFormModal>

    <AdminDeleteConfirm
      v-model:open="showDelete"
      :message="t('categoryTypes.deleteConfirm')"
      :loading="saving"
      @confirm="onDelete"
    />
  </div>
</template>
