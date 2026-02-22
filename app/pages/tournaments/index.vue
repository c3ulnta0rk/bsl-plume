<script setup lang="ts">
import type { PublicTournament } from '~/types/tournament'

const { t, d } = useI18n()

const { data: tournaments, status } = await useFetch<PublicTournament[]>('/api/tournaments')
</script>

<template>
  <UContainer class="py-8">
    <h1 class="text-2xl font-bold mb-6">
      {{ t('tournaments.title') }}
    </h1>

    <div
      v-if="status === 'pending'"
      class="text-center py-12"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-8 animate-spin text-muted"
      />
    </div>

    <div
      v-else-if="tournaments?.length"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <UCard
        v-for="t_ in tournaments"
        :key="t_.id"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-lg">
              {{ t_.name }}
            </h2>
            <UBadge
              :color="t_.status === 'published' ? 'primary' : 'neutral'"
              variant="subtle"
              size="sm"
            >
              {{ t(`tournaments.statuses.${t_.status}`) }}
            </UBadge>
          </div>
        </template>

        <div class="flex flex-col gap-1 text-sm text-muted">
          <div
            v-if="t_.date"
            class="flex items-center gap-2"
          >
            <UIcon
              name="i-lucide-calendar"
              class="size-4"
            />
            <span>{{ d(new Date(t_.date), 'short') }}</span>
          </div>
          <div
            v-if="t_.location"
            class="flex items-center gap-2"
          >
            <UIcon
              name="i-lucide-map-pin"
              class="size-4"
            />
            <span>{{ t_.location }}</span>
          </div>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-building-2"
              class="size-4"
            />
            <span>{{ t_.clubName }}</span>
          </div>
        </div>

        <template #footer>
          <UButton
            :to="`/tournaments/${t_.id}`"
            variant="outline"
            block
          >
            {{ t('tournaments.viewDetails') }}
          </UButton>
        </template>
      </UCard>
    </div>

    <p
      v-else
      class="text-center text-muted py-12"
    >
      {{ t('tournaments.noTournaments') }}
    </p>
  </UContainer>
</template>
