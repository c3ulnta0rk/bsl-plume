<script setup lang="ts">
const { t } = useI18n()
const { isAdmin } = useAdminAuth()

interface ColumnFilter {
  type: 'text' | 'select'
  options?: Array<{ label: string; value: string }>
  placeholder?: string
}

interface Column {
  accessorKey: string
  header: string
  filter?: ColumnFilter
}

const props = defineProps<{
  rows: Array<Record<string, unknown> & { id: string }>
  columns: Column[]
  loading?: boolean
  searchPlaceholder?: string
}>()

const emit = defineEmits<{
  edit: [item: Record<string, unknown> & { id: string }]
  delete: [item: Record<string, unknown> & { id: string }]
}>()

const search = ref('')
const columnFilters = ref<Record<string, string>>({})

const filterableColumns = computed(() =>
  props.columns.filter(col => col.filter)
)

const hasFilters = computed(() =>
  filterableColumns.value.length > 0
)

const filteredRows = computed(() => {
  let result = props.rows

  // Global search across all text columns
  const q = search.value.toLowerCase().trim()
  if (q) {
    result = result.filter(row =>
      props.columns.some(col => {
        const val = row[col.accessorKey]
        return val != null && String(val).toLowerCase().includes(q)
      })
    )
  }

  // Per-column filters
  for (const col of filterableColumns.value) {
    const filterVal = columnFilters.value[col.accessorKey]
    if (!filterVal) continue

    if (col.filter!.type === 'select') {
      result = result.filter(row => String(row[col.accessorKey] ?? '') === filterVal)
    } else {
      const fq = filterVal.toLowerCase()
      result = result.filter(row => {
        const val = row[col.accessorKey]
        return val != null && String(val).toLowerCase().includes(fq)
      })
    }
  }

  return result
})

const activeFilterCount = computed(() => {
  let count = search.value.trim() ? 1 : 0
  for (const key of Object.keys(columnFilters.value)) {
    if (columnFilters.value[key]) count++
  }
  return count
})

function clearFilters() {
  search.value = ''
  columnFilters.value = {}
}

const allColumns = computed(() => [
  ...props.columns,
  ...(isAdmin.value ? [{ accessorKey: 'actions', header: t('common.actions') }] : [])
])
</script>

<template>
  <div class="space-y-4">
    <!-- Filter bar -->
    <div class="flex flex-wrap items-end gap-3">
      <UInput
        v-model="search"
        :placeholder="searchPlaceholder ?? t('common.search')"
        icon="i-lucide-search"
        class="w-56"
      />
      <template v-if="hasFilters">
        <div
          v-for="col in filterableColumns"
          :key="col.accessorKey"
          class="flex flex-col gap-1"
        >
          <span class="text-xs text-muted">{{ col.header }}</span>
          <USelect
            v-if="col.filter!.type === 'select'"
            :model-value="columnFilters[col.accessorKey] || '_all'"
            :items="[
              { label: col.filter!.placeholder ?? t('common.all'), value: '_all' },
              ...(col.filter!.options ?? [])
            ]"
            size="sm"
            class="w-40"
            @update:model-value="columnFilters[col.accessorKey] = ($event as string) === '_all' ? '' : ($event as string)"
          />
          <UInput
            v-else
            :model-value="columnFilters[col.accessorKey] ?? ''"
            :placeholder="col.filter!.placeholder ?? col.header"
            size="sm"
            class="w-40"
            @update:model-value="columnFilters[col.accessorKey] = $event as string"
          />
        </div>
      </template>
      <UButton
        v-if="activeFilterCount > 0"
        variant="ghost"
        size="sm"
        icon="i-lucide-x"
        @click="clearFilters"
      >
        {{ t('common.clearFilters') }}
      </UButton>
    </div>

    <UTable
      :data="filteredRows"
      :columns="allColumns"
      :loading="loading"
    >
      <template
        v-for="col in columns"
        :key="col.accessorKey"
        #[`${col.accessorKey}-cell`]="{ row }"
      >
        <slot
          :name="`cell-${col.accessorKey}`"
          :row="row.original"
        >
          {{ row.original[col.accessorKey] }}
        </slot>
      </template>
      <template
        v-if="isAdmin"
        #actions-cell="{ row }"
      >
        <div class="flex gap-1">
          <UButton
            variant="ghost"
            size="xs"
            icon="i-lucide-pencil"
            @click="emit('edit', row.original)"
          />
          <UButton
            variant="ghost"
            size="xs"
            color="error"
            icon="i-lucide-trash-2"
            @click="emit('delete', row.original)"
          />
        </div>
      </template>
    </UTable>
    <p
      v-if="!loading && filteredRows.length === 0"
      class="text-center text-muted py-8"
    >
      {{ t('common.noResults') }}
    </p>
  </div>
</template>
