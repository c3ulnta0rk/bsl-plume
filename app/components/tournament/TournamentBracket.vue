<script setup lang="ts">
import type { KnockoutMatch } from '~/types/tournament'

const props = defineProps<{
  matches: KnockoutMatch[]
  editable?: boolean
}>()

const emit = defineEmits<{
  matchClick: [match: KnockoutMatch]
}>()

const { t } = useI18n()

const rounds = computed(() => {
  const map = new Map<number, KnockoutMatch[]>()
  for (const m of props.matches) {
    const round = m.round ?? 1
    const arr = map.get(round) ?? []
    arr.push(m)
    map.set(round, arr)
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([round, matches]) => ({
      round,
      label: getRoundLabel(round, map.size),
      matches: matches.sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0))
    }))
})

function getRoundLabel(round: number, totalRounds: number): string {
  if (round === totalRounds) return t('matches.roundLabels.final')
  if (round === totalRounds - 1) return t('matches.roundLabels.semiFinal')
  if (round === totalRounds - 2) return t('matches.roundLabels.quarterFinal')
  return t('matches.roundLabels.round', { n: round })
}

function onMatchClick(match: KnockoutMatch) {
  if (props.editable) {
    emit('matchClick', match)
  }
}
</script>

<template>
  <div
    v-if="matches.length > 0"
    class="flex gap-8 overflow-x-auto pb-4"
  >
    <div
      v-for="r in rounds"
      :key="r.round"
      class="flex flex-col shrink-0"
    >
      <div class="text-sm font-semibold text-muted mb-3 text-center">
        {{ r.label }}
      </div>
      <div class="flex flex-col justify-around flex-1 gap-4">
        <div
          v-for="match in r.matches"
          :key="match.id"
          class="border border-default rounded-lg w-64 overflow-hidden"
          :class="{
            'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-shadow': editable
          }"
          @click="onMatchClick(match)"
        >
          <!-- Team 1 -->
          <div
            class="flex items-center justify-between px-3 py-2 text-sm border-b border-default"
            :class="{
              'bg-success/10 font-semibold': match.winnerId === match.team1Id,
              'text-muted': match.winnerId != null && match.winnerId !== match.team1Id
            }"
          >
            <span class="truncate mr-2">{{ match.team1Name ?? t('matches.tbd') }}</span>
            <span class="text-xs shrink-0">
              {{ match.sets.map(s => s.score1).join(' / ') }}
            </span>
          </div>
          <!-- Team 2 -->
          <div
            class="flex items-center justify-between px-3 py-2 text-sm"
            :class="{
              'bg-success/10 font-semibold': match.winnerId === match.team2Id,
              'text-muted': match.winnerId != null && match.winnerId !== match.team2Id
            }"
          >
            <span class="truncate mr-2">{{ match.team2Name ?? t('matches.tbd') }}</span>
            <span class="text-xs shrink-0">
              {{ match.sets.map(s => s.score2).join(' / ') }}
            </span>
          </div>
          <!-- Status -->
          <div
            v-if="match.status !== 'completed'"
            class="text-center text-xs text-muted py-1 border-t border-default bg-elevated/50"
          >
            {{ t(`matches.statuses.${match.status}`) }}
          </div>
        </div>
      </div>
    </div>
  </div>
  <p
    v-else
    class="text-center text-muted py-8"
  >
    {{ t('matches.noKnockoutMatches') }}
  </p>
</template>
