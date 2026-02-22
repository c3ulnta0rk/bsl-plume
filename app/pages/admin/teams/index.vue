<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t } = useI18n()

interface TeamRow {
  id: string
  name: string
  seed: number | null
  tournamentId: string
  categoryId: string
  tournamentName: string | null
  categoryTypeName: string | null
}

const limit = 50
const page = ref(0)
const searchFilter = ref('')

const debouncedSearch = ref('')
let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(searchFilter, (val) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    debouncedSearch.value = val
    page.value = 0
  }, 300)
})

const { data, status } = await useFetch('/api/admin/teams', {
  query: computed(() => ({
    limit,
    offset: page.value * limit,
    ...(debouncedSearch.value ? { search: debouncedSearch.value } : {})
  }))
})

const rows = computed(() => (data.value?.rows ?? []) as TeamRow[])
const total = computed(() => data.value?.total ?? 0)
const totalPages = computed(() => Math.ceil(total.value / limit))

function prevPage() {
  if (page.value > 0) page.value--
}
function nextPage() {
  if (page.value < totalPages.value - 1) page.value++
}

const columns = computed(() => [
  { accessorKey: 'name' as const, header: t('teams.fields.name') },
  { accessorKey: 'tournamentName' as const, header: t('teams.fields.tournament') },
  { accessorKey: 'categoryTypeName' as const, header: t('teams.fields.category') },
  { accessorKey: 'seed' as const, header: t('teams.fields.seed') },
  { accessorKey: 'actions' as const, header: t('common.actions') }
])
</script>

<template>
  <div>
    <AdminPageHeader :title="t('teams.title')" />

    <div class="space-y-4">
      <!-- Filters -->
      <div class="flex flex-wrap items-end gap-3">
        <UInput
          v-model="searchFilter"
          :placeholder="t('common.search')"
          icon="i-lucide-search"
          class="w-56"
        />
        <UButton
          v-if="searchFilter"
          variant="ghost"
          size="sm"
          icon="i-lucide-x"
          @click="searchFilter = ''"
        >
          {{ t('common.clearFilters') }}
        </UButton>
      </div>

      <UTable
        :data="rows"
        :columns="columns"
        :loading="status === 'pending'"
      >
        <template #tournamentName-cell="{ row }">
          {{ row.original.tournamentName ?? '-' }}
        </template>
        <template #categoryTypeName-cell="{ row }">
          {{ row.original.categoryTypeName ?? '-' }}
        </template>
        <template #seed-cell="{ row }">
          {{ row.original.seed ?? '-' }}
        </template>
        <template #actions-cell="{ row }">
          <UButton
            variant="ghost"
            size="xs"
            icon="i-lucide-pencil"
            @click="navigateTo(`/admin/teams/${row.original.id}`)"
          />
        </template>
      </UTable>

      <p
        v-if="status !== 'pending' && rows.length === 0"
        class="text-center text-muted py-8"
      >
        {{ t('common.noResults') }}
      </p>

      <!-- Pagination -->
      <div
        v-if="totalPages > 1"
        class="flex items-center justify-between pt-2"
      >
        <span class="text-sm text-muted">
          {{ total }} {{ t('teams.title').toLowerCase() }}
        </span>
        <div class="flex gap-2">
          <UButton
            variant="outline"
            size="sm"
            :disabled="page === 0"
            icon="i-lucide-chevron-left"
            @click="prevPage"
          />
          <span class="text-sm leading-8">{{ page + 1 }} / {{ totalPages }}</span>
          <UButton
            variant="outline"
            size="sm"
            :disabled="page >= totalPages - 1"
            icon="i-lucide-chevron-right"
            @click="nextPage"
          />
        </div>
      </div>
    </div>
  </div>
</template>
