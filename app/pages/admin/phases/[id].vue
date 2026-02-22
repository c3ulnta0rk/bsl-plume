<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t } = useI18n()
const route = useRoute()
const { isAdmin } = useAdminAuth()
const id = route.params.id as string

const { data: phase } = await useFetch(`/api/admin/phases/${id}`)
const { data: poolsData, refresh: refreshPools } = await useFetch(`/api/admin/phases/${id}/pools`)
const { data: matchesData } = await useFetch(`/api/admin/phases/${id}/matches`)

// Pool creation
const showPoolModal = ref(false)
const poolForm = ref({ name: 'A' })
const saving = ref(false)

async function createPool() {
  saving.value = true
  try {
    await $fetch('/api/admin/pools', {
      method: 'POST',
      body: { phaseId: id, name: poolForm.value.name }
    })
    showPoolModal.value = false
    await refreshPools()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <AdminPageHeader :title="phase?.name ?? t('phases.title')">
      <template #breadcrumbs>
        <UBreadcrumb
          :items="[
            { label: t('nav.phases') },
            { label: phase?.name ?? '' }
          ]"
        />
      </template>
    </AdminPageHeader>

    <!-- Pool phase -->
    <template v-if="phase?.type === 'pool'">
      <div class="flex justify-end mb-4">
        <UButton
          v-if="isAdmin"
          icon="i-lucide-plus"
          @click="showPoolModal = true"
        >
          {{ t('pools.create') }}
        </UButton>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NuxtLink
          v-for="pool in poolsData ?? []"
          :key="pool.id"
          :to="`/admin/pools/${pool.id}`"
          class="block"
        >
          <UCard>
            <p class="font-semibold">
              {{ t('pools.title') }} {{ pool.name }}
            </p>
          </UCard>
        </NuxtLink>
      </div>
      <p
        v-if="!poolsData?.length"
        class="text-center text-muted py-8"
      >
        {{ t('common.noResults') }}
      </p>

      <AdminFormModal
        v-model:open="showPoolModal"
        :title="t('pools.create')"
        :loading="saving"
        @submit="createPool"
      >
        <UFormField
          :label="t('pools.fields.name')"
          required
        >
          <UInput
            v-model="poolForm.name"
            class="w-full"
          />
        </UFormField>
      </AdminFormModal>
    </template>

    <!-- Knockout phase -->
    <template v-else>
      <h3 class="font-semibold mb-4">
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
                {{ t('matches.fields.round') }}: {{ match.round ?? '-' }}
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
    </template>
  </div>
</template>
