<script setup lang="ts">
import type { PoolEntry, PoolMatch } from '~/types/tournament'

const props = defineProps<{
  poolName: string
  entries: PoolEntry[]
  matches: PoolMatch[]
  editable?: boolean
}>()

const emit = defineEmits<{
  matchClick: [match: PoolMatch]
}>()

const { t } = useI18n()

function getMatchBetween(team1Id: string, team2Id: string): PoolMatch | undefined {
  return props.matches.find(m =>
    (m.team1Id === team1Id && m.team2Id === team2Id)
    || (m.team1Id === team2Id && m.team2Id === team1Id)
  )
}

function getScoreDisplay(match: PoolMatch | undefined, forTeamId: string): string {
  if (!match || match.status !== 'completed' || match.sets.length === 0) return ''
  const isTeam1 = match.team1Id === forTeamId
  return match.sets
    .map(s => isTeam1 ? `${s.score1}-${s.score2}` : `${s.score2}-${s.score1}`)
    .join(' / ')
}

function isWinner(match: PoolMatch | undefined, teamId: string): boolean {
  return match?.winnerId === teamId
}

function getWins(teamId: string): number {
  return props.matches.filter(m => m.winnerId === teamId).length
}

function onCellClick(match: PoolMatch | undefined) {
  if (props.editable && match) {
    emit('matchClick', match)
  }
}
</script>

<template>
  <div class="border border-default rounded-lg overflow-hidden">
    <div class="bg-elevated px-3 py-2 font-semibold text-sm border-b border-default">
      {{ t('pools.pool', { name: poolName }) }}
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-default bg-elevated/50">
            <th class="text-left px-3 py-2 font-medium w-8">
              #
            </th>
            <th class="text-left px-3 py-2 font-medium">
              {{ t('matches.team') }}
            </th>
            <th
              v-for="(entry, ci) in entries"
              :key="entry.teamId"
              class="text-center px-2 py-2 font-medium w-28"
            >
              {{ ci + 1 }}
            </th>
            <th class="text-center px-3 py-2 font-medium w-12">
              {{ t('matches.wins') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(entry, ri) in entries"
            :key="entry.teamId"
            class="border-b border-default last:border-b-0 hover:bg-elevated/30"
          >
            <td class="px-3 py-2 text-muted">
              {{ entry.finalRank ?? ri + 1 }}
            </td>
            <td class="px-3 py-2 font-medium whitespace-nowrap">
              {{ entry.teamName }}
            </td>
            <td
              v-for="opponent in entries"
              :key="opponent.teamId"
              class="text-center px-2 py-1.5"
              :class="{
                'bg-default/50': entry.teamId === opponent.teamId,
                'text-success font-medium': entry.teamId !== opponent.teamId && isWinner(getMatchBetween(entry.teamId, opponent.teamId), entry.teamId),
                'text-error': entry.teamId !== opponent.teamId && getMatchBetween(entry.teamId, opponent.teamId)?.winnerId != null && !isWinner(getMatchBetween(entry.teamId, opponent.teamId), entry.teamId),
                'cursor-pointer hover:bg-primary/10': editable && entry.teamId !== opponent.teamId && getMatchBetween(entry.teamId, opponent.teamId)
              }"
              @click="entry.teamId !== opponent.teamId ? onCellClick(getMatchBetween(entry.teamId, opponent.teamId)) : undefined"
            >
              <template v-if="entry.teamId === opponent.teamId">
                <span class="text-muted">&mdash;</span>
              </template>
              <template v-else>
                <span class="text-xs">
                  {{ getScoreDisplay(getMatchBetween(entry.teamId, opponent.teamId), entry.teamId) || '·' }}
                </span>
              </template>
            </td>
            <td class="text-center px-3 py-2 font-semibold">
              {{ getWins(entry.teamId) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
