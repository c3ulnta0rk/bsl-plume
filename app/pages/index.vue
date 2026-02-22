<template>
  <div>
    <!-- Hero -->
    <section class="py-16 text-center">
      <UContainer class="space-y-6">
        <h1 class="text-4xl font-bold text-highlighted">
          {{ t('home.welcome') }}
        </h1>
        <p class="text-lg text-muted max-w-xl mx-auto">
          {{ t('home.subtitle') }}
        </p>
        <div
          v-if="!loggedIn"
          class="flex flex-wrap justify-center gap-4"
        >
          <UButton
            to="/signin"
            size="lg"
            variant="outline"
            trailing-icon="i-lucide-log-in"
          >
            {{ t('auth.login') }}
          </UButton>
          <UButton
            to="/signup"
            size="lg"
            trailing-icon="i-lucide-user-plus"
          >
            {{ t('auth.register') }}
          </UButton>
        </div>
      </UContainer>
    </section>

    <!-- Upcoming tournaments -->
    <section class="pb-16">
      <UContainer>
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-semibold text-highlighted">
            {{ t('home.upcomingTournaments') }}
          </h2>
          <UButton
            to="/tournaments"
            variant="ghost"
            trailing-icon="i-lucide-arrow-right"
          >
            {{ t('home.viewAll') }}
          </UButton>
        </div>

        <div
          v-if="upcoming?.length"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <UCard
            v-for="t_ in upcoming"
            :key="t_.id"
          >
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="font-semibold text-lg">
                  {{ t_.name }}
                </h3>
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
          class="text-center text-muted py-8"
        >
          {{ t('tournaments.noTournaments') }}
        </p>
      </UContainer>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { PublicTournament } from '~/types/tournament'

const { t, d } = useI18n()
const { loggedIn } = useUserSession()

const { data: tournaments } = await useFetch<PublicTournament[]>('/api/tournaments')

const upcoming = computed(() => {
  if (!tournaments.value) return []
  return tournaments.value
    .filter((t_) => t_.status === 'published')
    .sort((a, b) => {
      if (!a.date) return 1
      if (!b.date) return -1
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    })
    .slice(0, 6)
})
</script>
