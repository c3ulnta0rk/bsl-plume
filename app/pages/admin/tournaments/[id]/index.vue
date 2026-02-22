<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t } = useI18n()
const route = useRoute()
const { isAdmin } = useAdminAuth()
const id = route.params.id as string

const clubsStore = useClubsStore()
const categoryTypesStore = useCategoryTypesStore()
await Promise.all([clubsStore.fetchAll(), categoryTypesStore.fetchAll()])

const { data: tournament, refresh } = await useFetch(`/api/admin/tournaments/${id}`)
const { data: categories, refresh: refreshCategories } = await useFetch(`/api/admin/tournaments/${id}/categories`)
const { data: teamsData, refresh: refreshTeams } = await useFetch(`/api/admin/tournaments/${id}/teams`)

const form = ref({
  name: '',
  clubId: '',
  date: '',
  location: '',
  status: 'draft'
})

watch(tournament, (val) => {
  if (val) {
    form.value = {
      name: val.name as string,
      clubId: (val.clubId as string) ?? '',
      date: val.date ? new Date(val.date as string).toISOString().split('T')[0] ?? '' : '',
      location: (val.location as string) ?? '',
      status: val.status as string
    }
  }
}, { immediate: true })

const saving = ref(false)
const activeTab = ref('info')

async function onSave() {
  saving.value = true
  try {
    await $fetch(`/api/admin/tournaments/${id}`, { method: 'PUT', body: form.value })
    await refresh()
  } finally {
    saving.value = false
  }
}

// Category creation
const showCategoryModal = ref(false)
const categoryForm = ref({ categoryTypeId: '', maxTeams: 16 })

async function onCreateCategory() {
  saving.value = true
  try {
    await $fetch('/api/admin/categories', {
      method: 'POST',
      body: { tournamentId: id, ...categoryForm.value }
    })
    showCategoryModal.value = false
    await refreshCategories()
  } finally {
    saving.value = false
  }
}

const statusOptions = ['draft', 'published', 'archived'].map(s => ({
  label: t(`tournaments.statuses.${s}`), value: s
}))

const tabs = [
  { label: t('tournaments.tabs.info'), value: 'info', slot: 'info-content' as const },
  { label: t('tournaments.tabs.categories'), value: 'categories', slot: 'categories-content' as const },
  { label: t('tournaments.tabs.teams'), value: 'teams', slot: 'teams-content' as const }
]

const categoryColumns = computed(() => [
  { accessorKey: 'categoryTypeId' as const, header: t('categories.fields.type') },
  { accessorKey: 'maxTeams' as const, header: t('categories.fields.maxTeams') },
  { accessorKey: 'status' as const, header: t('categories.fields.status') }
])

const teamColumns = computed(() => [
  { accessorKey: 'name' as const, header: t('teams.fields.name') },
  { accessorKey: 'seed' as const, header: t('teams.fields.seed') }
])
</script>

<template>
  <div>
    <AdminPageHeader :title="tournament?.name ?? t('tournaments.edit')">
      <template #breadcrumbs>
        <UBreadcrumb
          :items="[
            { label: t('nav.tournaments'), to: '/admin/tournaments' },
            { label: tournament?.name ?? '' }
          ]"
        />
      </template>
      <template #actions>
        <UButton
          variant="outline"
          icon="i-lucide-eye"
          :to="`/admin/tournaments/${id}/view`"
        >
          {{ t('tournaments.viewBracket') }}
        </UButton>
      </template>
    </AdminPageHeader>

    <UTabs
      v-model="activeTab"
      :items="tabs"
    >
      <template #info-content>
        <UCard class="max-w-lg mt-4">
          <form
            class="space-y-4"
            @submit.prevent="onSave"
          >
            <UFormField
              :label="t('tournaments.fields.name')"
              required
            >
              <UInput
                v-model="form.name"
                :disabled="!isAdmin"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('tournaments.fields.club')">
              <USelect
                v-model="form.clubId"
                :items="clubsStore.items.map(c => ({ label: c.name, value: c.id }))"
                :disabled="!isAdmin"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('tournaments.fields.date')">
              <UInput
                v-model="form.date"
                type="date"
                :disabled="!isAdmin"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('tournaments.fields.location')">
              <UInput
                v-model="form.location"
                :disabled="!isAdmin"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('tournaments.fields.status')">
              <USelect
                v-model="form.status"
                :items="statusOptions"
                :disabled="!isAdmin"
                class="w-full"
              />
            </UFormField>
            <UButton
              v-if="isAdmin"
              type="submit"
              :loading="saving"
            >
              {{ t('common.save') }}
            </UButton>
          </form>
        </UCard>
      </template>

      <template #categories-content>
        <div class="mt-4">
          <div class="flex justify-end mb-4">
            <UButton
              v-if="isAdmin"
              icon="i-lucide-plus"
              @click="showCategoryModal = true"
            >
              {{ t('categories.create') }}
            </UButton>
          </div>
          <UTable
            :data="categories ?? []"
            :columns="categoryColumns"
          >
            <template #categoryTypeId-cell="{ row }">
              {{ categoryTypesStore.items.find(ct => ct.id === row.original.categoryTypeId)?.name ?? row.original.categoryTypeId }}
            </template>
            <template #status-cell="{ row }">
              <AdminStatusBadge :status="row.original.status" />
            </template>
          </UTable>
        </div>

        <AdminFormModal
          v-model:open="showCategoryModal"
          :title="t('categories.create')"
          :loading="saving"
          @submit="onCreateCategory"
        >
          <UFormField
            :label="t('categories.fields.type')"
            required
          >
            <USelect
              v-model="categoryForm.categoryTypeId"
              :items="categoryTypesStore.items.map(ct => ({ label: ct.name, value: ct.id }))"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('categories.fields.maxTeams')">
            <UInput
              v-model.number="categoryForm.maxTeams"
              type="number"
              class="w-full"
            />
          </UFormField>
        </AdminFormModal>
      </template>

      <template #teams-content>
        <div class="mt-4">
          <UTable
            :data="teamsData ?? []"
            :columns="teamColumns"
          />
          <p
            v-if="!teamsData?.length"
            class="text-center text-muted py-8"
          >
            {{ t('common.noResults') }}
          </p>
        </div>
      </template>
    </UTabs>
  </div>
</template>
