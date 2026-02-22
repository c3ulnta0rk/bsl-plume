<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t } = useI18n()
const route = useRoute()
const { isAdmin } = useAdminAuth()
const id = route.params.id as string

const { data: team, refresh } = await useFetch(`/api/admin/teams/${id}`)
const form = ref({ name: '', seed: null as number | null })
const saving = ref(false)

watch(team, (val) => {
  if (val) {
    form.value = { name: val.name, seed: val.seed }
  }
}, { immediate: true })

async function onSubmit() {
  saving.value = true
  try {
    await $fetch(`/api/admin/teams/${id}`, { method: 'PUT', body: form.value })
    await refresh()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <AdminPageHeader :title="t('teams.edit')">
      <template #breadcrumbs>
        <UBreadcrumb
          :items="[
            { label: t('nav.teams'), to: '/admin/teams' },
            { label: team?.name ?? '' }
          ]"
        />
      </template>
    </AdminPageHeader>

    <UCard class="max-w-lg">
      <form
        class="space-y-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="t('teams.fields.name')"
          required
        >
          <UInput
            v-model="form.name"
            :disabled="!isAdmin"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('teams.fields.seed')">
          <UInput
            v-model.number="form.seed"
            type="number"
            :disabled="!isAdmin"
            class="w-full"
          />
        </UFormField>
        <UButton
          v-if="isAdmin"
          type="submit"
          :loading="saving"
        >
          {{ t('common.save') }}
        </UButton>
      </form>
    </UCard>
  </div>
</template>
