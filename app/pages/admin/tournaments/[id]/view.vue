<script setup lang="ts">
import type { PoolMatch, KnockoutMatch } from '~/types/tournament'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t } = useI18n()
const route = useRoute()
const id = route.params.id as string

const { data: tournament } = await useFetch(`/api/admin/tournaments/${id}`)
const { data: structure, status, refresh } = await useFetch(`/api/admin/tournaments/${id}/structure`)

const activeCategoryIndex = ref(0)

const currentCategory = computed(() => {
  return structure.value?.categories?.[activeCategoryIndex.value] ?? null
})

const poolPhases = computed(() =>
  (currentCategory.value?.phases ?? []).filter(p => p.type === 'pool')
)

const knockoutPhases = computed(() =>
  (currentCategory.value?.phases ?? []).filter(p => p.type === 'knockout')
)

const stats = computed(() => {
  if (!currentCategory.value) return null
  const allMatches = currentCategory.value.phases.flatMap(p => [
    ...p.pools.flatMap(pool => pool.matches),
    ...p.knockoutMatches
  ])
  const completed = allMatches.filter(m => m.status === 'completed').length
  const total = allMatches.length
  return { completed, total, pending: total - completed }
})

// Match edit modal state
const showMatchModal = ref(false)
const selectedMatch = ref<PoolMatch | KnockoutMatch | null>(null)

function onMatchClick(match: PoolMatch | KnockoutMatch) {
  selectedMatch.value = match
  showMatchModal.value = true
}

async function onMatchSaved() {
  await refresh()
}
</script>

<template>
  <div>
    <AdminPageHeader :title="tournament?.name ?? ''">
      <template #breadcrumbs>
        <UBreadcrumb
          :items="[
            { label: t('nav.tournaments'), to: '/admin/tournaments' },
            { label: tournament?.name ?? '', to: `/admin/tournaments/${id}` },
            { label: t('common.view') }
          ]"
        />
      </template>
      <template #actions>
        <UButton
          variant="outline"
          icon="i-lucide-arrow-left"
          :to="`/admin/tournaments/${id}`"
        >
          {{ t('common.back') }}
        </UButton>
      </template>
    </AdminPageHeader>

    <div
      v-if="status === 'pending'"
      class="text-center py-12"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-8 animate-spin text-muted"
      />
    </div>

    <template v-else-if="structure?.categories?.length">
      <!-- Category selector tabs -->
      <div class="flex flex-wrap gap-2 mb-6">
        <UButton
          v-for="(cat, i) in structure.categories"
          :key="cat.id"
          :variant="activeCategoryIndex === i ? 'solid' : 'outline'"
          size="sm"
          @click="activeCategoryIndex = i"
        >
          {{ cat.typeName }}
        </UButton>
      </div>

      <!-- Stats bar -->
      <div
        v-if="stats"
        class="flex gap-6 mb-6 text-sm"
      >
        <div class="flex items-center gap-2">
          <UBadge
            color="success"
            variant="subtle"
            size="sm"
          >
            {{ stats.completed }}
          </UBadge>
          <span class="text-muted">{{ t('matches.statuses.completed') }}</span>
        </div>
        <div class="flex items-center gap-2">
          <UBadge
            color="warning"
            variant="subtle"
            size="sm"
          >
            {{ stats.pending }}
          </UBadge>
          <span class="text-muted">{{ t('matches.statuses.pending') }}</span>
        </div>
        <div class="text-muted">
          {{ t('matches.totalMatches', { n: stats.total }) }}
        </div>
      </div>

      <!-- Pool phases -->
      <template
        v-for="phase in poolPhases"
        :key="phase.id"
      >
        <h3 class="text-lg font-semibold mb-4">
          {{ phase.name }}
          <AdminStatusBadge
            :status="phase.status"
            class="ml-2"
          />
        </h3>

        <div
          v-if="phase.pools.length > 0"
          class="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-8"
        >
          <TournamentPoolTable
            v-for="pool in phase.pools"
            :key="pool.id"
            :pool-name="pool.name"
            :entries="pool.entries"
            :matches="pool.matches"
            :editable="true"
            @match-click="onMatchClick"
          />
        </div>
        <p
          v-else
          class="text-muted text-center py-6 mb-8"
        >
          {{ t('phases.noPools') }}
        </p>
      </template>

      <!-- Knockout phases -->
      <template
        v-for="phase in knockoutPhases"
        :key="phase.id"
      >
        <h3 class="text-lg font-semibold mb-4">
          {{ phase.name }}
          <AdminStatusBadge
            :status="phase.status"
            class="ml-2"
          />
        </h3>
        <TournamentBracket
          :matches="phase.knockoutMatches"
          :editable="true"
          @match-click="onMatchClick"
        />
      </template>

      <!-- Empty state if no phases -->
      <p
        v-if="currentCategory && currentCategory.phases.length === 0"
        class="text-center text-muted py-12"
      >
        {{ t('phases.noPhases') }}
      </p>
    </template>

    <p
      v-else
      class="text-center text-muted py-12"
    >
      {{ t('categories.noCategories') }}
    </p>

    <!-- Match edit modal -->
    <AdminMatchEditModal
      v-model:open="showMatchModal"
      :match="selectedMatch"
      @saved="onMatchSaved"
    />
  </div>
</template>
