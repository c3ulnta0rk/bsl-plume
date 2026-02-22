<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t } = useI18n()
const route = useRoute()
const id = route.params.id as string

const { data: pool } = await useFetch(`/api/admin/pools/${id}`)
const { data: entries } = await useFetch(`/api/admin/pools/${id}/entries`)
const { data: matchesData } = await useFetch(`/api/admin/pools/${id}/matches`)
</script>

<template>
  <div>
    <AdminPageHeader :title="`${t('pools.title')} ${pool?.name ?? ''}`">
      <template #breadcrumbs>
        <UBreadcrumb
          :items="[
            { label: t('nav.pools') },
            { label: pool?.name ?? '' }
          ]"
        />
      </template>
    </AdminPageHeader>

    <!-- Entries -->
    <h3 class="font-semibold mb-3">
      {{ t('pools.entries') }}
    </h3>
    <UTable
      :data="entries ?? []"
      :columns="[
        { accessorKey: 'teamId', header: t('teams.title') },
        { accessorKey: 'finalRank', header: 'Rank' }
      ]"
      class="mb-8"
    />

    <!-- Matches -->
    <h3 class="font-semibold mb-3">
      {{ t('matches.title') }}
    </h3>
    <div class="space-y-2">
      <NuxtLink
        v-for="match in matchesData ?? []"
        :key="match.id"
        :to="`/admin/matches/${match.id}`"
        class="block"
      >
        <UCard>
          <div class="flex items-center justify-between">
            <span class="text-sm">
              Match #{{ match.id.slice(0, 8) }}
            </span>
            <AdminStatusBadge :status="match.status" />
          </div>
        </UCard>
      </NuxtLink>
    </div>
    <p
      v-if="!matchesData?.length"
      class="text-center text-muted py-8"
    >
      {{ t('common.noResults') }}
    </p>
  </div>
</template>
