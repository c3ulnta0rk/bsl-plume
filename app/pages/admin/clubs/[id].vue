<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t } = useI18n()
const route = useRoute()
const { isAdmin } = useAdminAuth()
const id = route.params.id as string

const { data: club, refresh } = await useFetch(`/api/admin/clubs/${id}`)
const form = ref({ name: club.value?.name ?? '' })
const saving = ref(false)

watch(club, (val) => {
  if (val) form.value.name = val.name
})

async function onSubmit() {
  saving.value = true
  try {
    await $fetch(`/api/admin/clubs/${id}`, { method: 'PUT', body: form.value })
    await refresh()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <AdminPageHeader :title="t('clubs.edit')">
      <template #breadcrumbs>
        <UBreadcrumb
          :items="[
            { label: t('nav.clubs'), to: '/admin/clubs' },
            { label: club?.name ?? '' }
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
          :label="t('clubs.fields.name')"
          required
        >
          <UInput
            v-model="form.name"
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
