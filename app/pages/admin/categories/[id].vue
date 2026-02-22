<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t } = useI18n()
const route = useRoute()
const { isAdmin } = useAdminAuth()
const id = route.params.id as string

const { data: category } = await useFetch(`/api/admin/categories/${id}`)
const { data: teamsData } = await useFetch(`/api/admin/categories/${id}/teams`)
const { data: phasesData, refresh: refreshPhases } = await useFetch(`/api/admin/categories/${id}/phases`)

const activeTab = ref('teams')

// Phase creation
const showPhaseModal = ref(false)
const phaseForm = ref({ name: '', type: 'pool', phaseOrder: 1 })
const saving = ref(false)

async function createPhase() {
  saving.value = true
  try {
    await $fetch('/api/admin/phases', {
      method: 'POST',
      body: { categoryId: id, ...phaseForm.value, config: {} }
    })
    showPhaseModal.value = false
    await refreshPhases()
  } finally {
    saving.value = false
  }
}

const tabs = [
  { label: t('categories.tabs.teams'), value: 'teams', slot: 'teams-content' as const },
  { label: t('categories.tabs.phases'), value: 'phases', slot: 'phases-content' as const }
]

const phaseTypeOptions = [
  { label: t('phases.phaseTypes.pool'), value: 'pool' },
  { label: t('phases.phaseTypes.knockout'), value: 'knockout' }
]
</script>

<template>
  <div>
    <AdminPageHeader :title="t('categories.edit')">
      <template #breadcrumbs>
        <UBreadcrumb
          :items="[
            { label: t('nav.categories'), to: '/admin/categories' },
            { label: `#${category?.id?.slice(0, 8) ?? ''}` }
          ]"
        />
      </template>
    </AdminPageHeader>

    <UTabs
      v-model="activeTab"
      :items="tabs"
    >
      <template #teams-content>
        <div class="mt-4">
          <UTable
            :data="teamsData ?? []"
            :columns="[
              { accessorKey: 'name', header: t('teams.fields.name') },
              { accessorKey: 'seed', header: t('teams.fields.seed') }
            ]"
          />
          <p
            v-if="!teamsData?.length"
            class="text-center text-muted py-8"
          >
            {{ t('common.noResults') }}
          </p>
        </div>
      </template>

      <template #phases-content>
        <div class="mt-4">
          <div class="flex justify-end mb-4">
            <UButton
              v-if="isAdmin"
              icon="i-lucide-plus"
              @click="showPhaseModal = true"
            >
              {{ t('phases.create') }}
            </UButton>
          </div>
          <div class="space-y-3">
            <NuxtLink
              v-for="phase in phasesData ?? []"
              :key="phase.id"
              :to="`/admin/phases/${phase.id}`"
              class="block"
            >
              <UCard>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium">
                      {{ phase.name }}
                    </p>
                    <p class="text-sm text-muted">
                      {{ t(`phases.phaseTypes.${phase.type}`) }} - {{ t('phases.fields.order') }}: {{ phase.phaseOrder }}
                    </p>
                  </div>
                  <AdminStatusBadge :status="phase.status" />
                </div>
              </UCard>
            </NuxtLink>
          </div>
          <p
            v-if="!phasesData?.length"
            class="text-center text-muted py-8"
          >
            {{ t('common.noResults') }}
          </p>
        </div>

        <AdminFormModal
          v-model:open="showPhaseModal"
          :title="t('phases.create')"
          :loading="saving"
          @submit="createPhase"
        >
          <UFormField
            :label="t('phases.fields.name')"
            required
          >
            <UInput
              v-model="phaseForm.name"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('phases.fields.type')">
            <USelect
              v-model="phaseForm.type"
              :items="phaseTypeOptions"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('phases.fields.order')">
            <UInput
              v-model.number="phaseForm.phaseOrder"
              type="number"
              class="w-full"
            />
          </UFormField>
        </AdminFormModal>
      </template>
    </UTabs>
  </div>
</template>
