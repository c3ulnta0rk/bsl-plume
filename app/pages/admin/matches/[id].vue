<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t } = useI18n()
const route = useRoute()
const { isAdmin } = useAdminAuth()
const id = route.params.id as string

const { data: match, refresh } = await useFetch(`/api/admin/matches/${id}`)
const { data: setsData, refresh: refreshSets } = await useFetch(`/api/admin/matches/${id}/sets`)

const saving = ref(false)

// Status update
async function updateStatus(status: string) {
  saving.value = true
  try {
    await $fetch(`/api/admin/matches/${id}`, { method: 'PUT', body: { status } })
    await refresh()
  } finally {
    saving.value = false
  }
}

// Set scoring
async function updateSetScore(setId: string, score1: number, score2: number) {
  await $fetch(`/api/admin/sets/${setId}`, {
    method: 'PUT',
    body: { score1, score2 }
  })
  await refreshSets()
}

async function addSet() {
  const nextNumber = (setsData.value?.length ?? 0) + 1
  await $fetch('/api/admin/sets', {
    method: 'POST',
    body: { matchId: id, setNumber: nextNumber, score1: 0, score2: 0 }
  })
  await refreshSets()
}

const statusOptions = [
  { label: t('matches.statuses.pending'), value: 'pending' },
  { label: t('matches.statuses.in_progress'), value: 'in_progress' },
  { label: t('matches.statuses.completed'), value: 'completed' }
]
</script>

<template>
  <div>
    <AdminPageHeader :title="t('matches.edit')">
      <template #breadcrumbs>
        <UBreadcrumb
          :items="[
            { label: t('nav.matches') },
            { label: `#${match?.id?.slice(0, 8) ?? ''}` }
          ]"
        />
      </template>
    </AdminPageHeader>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Match info -->
      <UCard>
        <template #header>
          <h3 class="font-semibold">
            {{ t('tournaments.tabs.info') }}
          </h3>
        </template>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-muted">{{ t('matches.fields.status') }}</span>
            <AdminStatusBadge :status="match?.status ?? 'pending'" />
          </div>
          <div class="flex justify-between">
            <span class="text-muted">{{ t('matches.fields.court') }}</span>
            <span>{{ match?.court ?? '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">{{ t('matches.fields.round') }}</span>
            <span>{{ match?.round ?? '-' }}</span>
          </div>
          <div
            v-if="isAdmin"
            class="pt-2"
          >
            <UFormField :label="t('matches.fields.status')">
              <USelect
                :model-value="match?.status"
                :items="statusOptions"
                class="w-full"
                @update:model-value="updateStatus($event as string)"
              />
            </UFormField>
          </div>
        </div>
      </UCard>

      <!-- Sets scoring -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">
              {{ t('sets.title') }}
            </h3>
            <UButton
              v-if="isAdmin"
              size="xs"
              variant="ghost"
              icon="i-lucide-plus"
              @click="addSet"
            >
              {{ t('sets.addSet') }}
            </UButton>
          </div>
        </template>
        <div class="space-y-3">
          <div
            v-for="s in setsData ?? []"
            :key="s.id"
            class="flex items-center gap-3"
          >
            <span class="text-sm text-muted w-16">{{ t('sets.set', { n: s.setNumber }) }}</span>
            <UInput
              :model-value="s.score1"
              type="number"
              size="sm"
              class="w-16"
              :disabled="!isAdmin"
              @update:model-value="updateSetScore(s.id, Number($event), s.score2)"
            />
            <span class="text-muted">-</span>
            <UInput
              :model-value="s.score2"
              type="number"
              size="sm"
              class="w-16"
              :disabled="!isAdmin"
              @update:model-value="updateSetScore(s.id, s.score1, Number($event))"
            />
          </div>
          <p
            v-if="!setsData?.length"
            class="text-center text-muted py-4 text-sm"
          >
            {{ t('common.noResults') }}
          </p>
        </div>
      </UCard>
    </div>
  </div>
</template>
