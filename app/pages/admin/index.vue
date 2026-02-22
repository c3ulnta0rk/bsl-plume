<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t } = useI18n()
const { data: clubs } = await useFetch('/api/admin/clubs')
const { data: tournaments } = await useFetch('/api/admin/tournaments')
const { data: users } = await useFetch('/api/admin/users')

const stats = computed(() => [
  { label: t('dashboard.totalClubs'), value: clubs.value?.length ?? 0, icon: 'i-lucide-building-2', to: '/admin/clubs' },
  { label: t('dashboard.totalTournaments'), value: tournaments.value?.length ?? 0, icon: 'i-lucide-trophy', to: '/admin/tournaments' },
  { label: t('dashboard.totalUsers'), value: users.value?.length ?? 0, icon: 'i-lucide-users', to: '/admin/users' }
])

const recentTournaments = computed(() =>
  (tournaments.value ?? []).slice(0, 5)
)
</script>

<template>
  <div>
    <AdminPageHeader :title="t('dashboard.title')" />

    <!-- Stats cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <NuxtLink
        v-for="stat in stats"
        :key="stat.label"
        :to="stat.to"
        class="block"
      >
        <UCard>
          <div class="flex items-center gap-4">
            <div class="p-3 rounded-lg bg-primary/10">
              <UIcon
                :name="stat.icon"
                class="size-6 text-primary"
              />
            </div>
            <div>
              <p class="text-sm text-muted">
                {{ stat.label }}
              </p>
              <p class="text-2xl font-bold">
                {{ stat.value }}
              </p>
            </div>
          </div>
        </UCard>
      </NuxtLink>
    </div>

    <!-- Quick actions -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <h3 class="font-semibold">
            {{ t('dashboard.quickActions') }}
          </h3>
        </template>
        <div class="flex flex-wrap gap-3">
          <UButton
            to="/admin/clubs"
            variant="outline"
            icon="i-lucide-building-2"
          >
            {{ t('dashboard.createClub') }}
          </UButton>
          <UButton
            to="/admin/tournaments"
            variant="outline"
            icon="i-lucide-trophy"
          >
            {{ t('dashboard.createTournament') }}
          </UButton>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="font-semibold">
            {{ t('dashboard.recentTournaments') }}
          </h3>
        </template>
        <ul class="divide-y divide-default">
          <li
            v-for="tournament in recentTournaments"
            :key="tournament.id"
            class="py-2 flex items-center justify-between"
          >
            <NuxtLink
              :to="`/admin/tournaments/${tournament.id}`"
              class="text-sm hover:text-primary transition-colors"
            >
              {{ tournament.name }}
            </NuxtLink>
            <AdminStatusBadge :status="tournament.status" />
          </li>
          <li
            v-if="recentTournaments.length === 0"
            class="py-4 text-center text-muted text-sm"
          >
            {{ t('common.noResults') }}
          </li>
        </ul>
      </UCard>
    </div>
  </div>
</template>
