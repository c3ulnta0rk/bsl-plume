<script setup lang="ts">
import type { PublicTournament, TournamentStructure } from '~/types/tournament'

const { t, d } = useI18n()
const route = useRoute()
const id = route.params.id as string

const { data: tournament, error: tournamentError } = await useFetch<PublicTournament>(`/api/tournaments/${id}`)
const { data: structure, status } = await useFetch<TournamentStructure>(`/api/tournaments/${id}/structure`)

if (tournamentError.value) {
  throw createError({ statusCode: 404, message: 'Tournament not found' })
}

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

const activePhaseTab = ref('pools')

const phaseTabs = computed(() => {
  const tabs = []
  if (poolPhases.value.length > 0) {
    tabs.push({ label: t('phases.phaseTypes.pool'), value: 'pools', icon: 'i-lucide-grid-3x3' })
  }
  if (knockoutPhases.value.length > 0) {
    tabs.push({ label: t('phases.phaseTypes.knockout'), value: 'knockout', icon: 'i-lucide-trophy' })
  }
  return tabs
})

watch(activeCategoryIndex, () => {
  activePhaseTab.value = poolPhases.value.length > 0 ? 'pools' : 'knockout'
})

const stats = computed(() => {
  if (!currentCategory.value) return null
  const phases = activePhaseTab.value === 'pools' ? poolPhases.value : knockoutPhases.value
  const allMatches = phases.flatMap(p => [
    ...p.pools.flatMap(pool => pool.matches),
    ...p.knockoutMatches
  ])
  const completed = allMatches.filter(m => m.status === 'completed').length
  const total = allMatches.length
  return { completed, total, pending: total - completed }
})
</script>

<template>
  <UContainer class="py-8">
    <!-- Header -->
    <div class="mb-8">
      <UButton
        variant="ghost"
        icon="i-lucide-arrow-left"
        to="/tournaments"
        size="sm"
        class="mb-4"
      >
        {{ t('common.back') }}
      </UButton>

      <h1 class="text-2xl font-bold">
        {{ tournament?.name }}
      </h1>

      <div class="flex flex-wrap gap-4 mt-2 text-sm text-muted">
        <div
          v-if="tournament?.date"
          class="flex items-center gap-1"
        >
          <UIcon
            name="i-lucide-calendar"
            class="size-4"
          />
          <span>{{ d(new Date(tournament.date), 'short') }}</span>
        </div>
        <div
          v-if="tournament?.location"
          class="flex items-center gap-1"
        >
          <UIcon
            name="i-lucide-map-pin"
            class="size-4"
          />
          <span>{{ tournament.location }}</span>
        </div>
        <div class="flex items-center gap-1">
          <UIcon
            name="i-lucide-building-2"
            class="size-4"
          />
          <span>{{ tournament?.clubName }}</span>
        </div>
      </div>
    </div>

    <!-- Loading -->
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

      <!-- Phase tabs -->
      <div
        v-if="phaseTabs.length > 1"
        class="flex gap-2 mb-6"
      >
        <UButton
          v-for="tab in phaseTabs"
          :key="tab.value"
          :variant="activePhaseTab === tab.value ? 'solid' : 'outline'"
          :icon="tab.icon"
          size="sm"
          @click="activePhaseTab = tab.value"
        >
          {{ tab.label }}
        </UButton>
      </div>

      <!-- Stats bar -->
      <div
        v-if="stats && stats.total > 0"
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
      <template v-if="activePhaseTab === 'pools'">
        <template
          v-for="phase in poolPhases"
          :key="phase.id"
        >
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
            />
          </div>
          <p
            v-else
            class="text-muted text-center py-6 mb-8"
          >
            {{ t('phases.noPools') }}
          </p>
        </template>
      </template>

      <!-- Knockout phases -->
      <template v-if="activePhaseTab === 'knockout'">
        <template
          v-for="phase in knockoutPhases"
          :key="phase.id"
        >
          <TournamentBracket :matches="phase.knockoutMatches" />
        </template>
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
  </UContainer>
</template>
