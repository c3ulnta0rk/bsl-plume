<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t } = useI18n()

interface MatchRow {
  id: string
  status: string
  court: string | null
  round: number | null
  team1Id: string | null
  team2Id: string | null
  winnerId: string | null
  team1Name: string | null
  team2Name: string | null
}

const limit = 50
const page = ref(0)
const searchFilter = ref('')
const statusFilter = ref('_all')

// Debounce search to avoid excessive requests
const debouncedSearch = ref('')
let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(searchFilter, (val) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    debouncedSearch.value = val
    page.value = 0
  }, 300)
})

watch(statusFilter, () => { page.value = 0 })

const { data, status } = await useFetch('/api/admin/matches', {
  query: computed(() => ({
    limit,
    offset: page.value * limit,
    ...(statusFilter.value && statusFilter.value !== '_all' ? { status: statusFilter.value } : {}),
    ...(debouncedSearch.value ? { search: debouncedSearch.value } : {})
  }))
})

const rows = computed(() => (data.value?.rows ?? []) as MatchRow[])
const total = computed(() => data.value?.total ?? 0)
const totalPages = computed(() => Math.ceil(total.value / limit))

function prevPage() {
  if (page.value > 0) page.value--
}
function nextPage() {
  if (page.value < totalPages.value - 1) page.value++
}

const statusOptions = [
  { label: t('matches.statuses.pending'), value: 'pending' },
  { label: t('matches.statuses.in_progress'), value: 'in_progress' },
  { label: t('matches.statuses.completed'), value: 'completed' }
]

const columns = computed(() => [
  { accessorKey: 'team1Name' as const, header: t('matches.fields.team1') },
  { accessorKey: 'team2Name' as const, header: t('matches.fields.team2') },
  { accessorKey: 'status' as const, header: t('matches.fields.status') },
  { accessorKey: 'court' as const, header: t('matches.fields.court') },
  { accessorKey: 'actions' as const, header: t('common.actions') }
])

function clearFilters() {
  searchFilter.value = ''
  statusFilter.value = '_all'
}
</script>

<template>
  <div>
    <AdminPageHeader :title="t('matches.title')" />

    <div class="space-y-4">
      <!-- Filters -->
      <div class="flex flex-wrap items-end gap-3">
        <UInput
          v-model="searchFilter"
          :placeholder="t('common.search')"
          icon="i-lucide-search"
          class="w-56"
        />
        <div class="flex flex-col gap-1">
          <span class="text-xs text-muted">{{ t('matches.fields.status') }}</span>
          <USelect
            v-model="statusFilter"
            :items="[{ label: t('common.all'), value: '_all' }, ...statusOptions]"
            size="sm"
            class="w-40"
          />
        </div>
        <UButton
          v-if="searchFilter || (statusFilter && statusFilter !== '_all')"
          variant="ghost"
          size="sm"
          icon="i-lucide-x"
          @click="clearFilters"
        >
          {{ t('common.clearFilters') }}
        </UButton>
      </div>

      <UTable
        :data="rows"
        :columns="columns"
        :loading="status === 'pending'"
      >
        <template #team1Name-cell="{ row }">
          {{ row.original.team1Name ?? '-' }}
        </template>
        <template #team2Name-cell="{ row }">
          {{ row.original.team2Name ?? '-' }}
        </template>
        <template #status-cell="{ row }">
          <AdminStatusBadge :status="row.original.status" />
        </template>
        <template #court-cell="{ row }">
          {{ row.original.court ?? '-' }}
        </template>
        <template #actions-cell="{ row }">
          <UButton
            variant="ghost"
            size="xs"
            icon="i-lucide-pencil"
            @click="navigateTo(`/admin/matches/${row.original.id}`)"
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
          {{ total }} {{ t('matches.title').toLowerCase() }}
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
