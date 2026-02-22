<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { t } = useI18n()
const route = useRoute()
const { isAdmin } = useAdminAuth()
const id = route.params.id as string

const clubsStore = useClubsStore()
await clubsStore.fetchAll()

const { data: userItem, refresh } = await useFetch(`/api/admin/users/${id}`)
const form = ref({
  name: '',
  role: 'user',
  clubId: undefined as string | undefined,
  licenseNumber: ''
})

watch(userItem, (val) => {
  if (val) {
    form.value = {
      name: val.name,
      role: val.role,
      clubId: val.clubId ?? undefined,
      licenseNumber: val.licenseNumber ?? ''
    }
  }
}, { immediate: true })

const saving = ref(false)

async function onSubmit() {
  saving.value = true
  try {
    await $fetch(`/api/admin/users/${id}`, { method: 'PUT', body: form.value })
    await refresh()
  } finally {
    saving.value = false
  }
}

const roleOptions = [
  { label: t('users.roles.admin'), value: 'admin' },
  { label: t('users.roles.user'), value: 'user' }
]
</script>

<template>
  <div>
    <AdminPageHeader :title="t('users.edit')">
      <template #breadcrumbs>
        <UBreadcrumb
          :items="[
            { label: t('nav.users'), to: '/admin/users' },
            { label: userItem?.name ?? '' }
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
          :label="t('users.fields.name')"
          required
        >
          <UInput
            v-model="form.name"
            :disabled="!isAdmin"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('users.fields.role')">
          <USelect
            v-model="form.role"
            :items="roleOptions"
            :disabled="!isAdmin"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('users.fields.club')">
          <USelect
            v-model="form.clubId"
            :items="clubsStore.items.map(c => ({ label: c.name, value: c.id }))"
            :disabled="!isAdmin"
            class="w-full"
            placeholder="-"
          />
        </UFormField>
        <UFormField :label="t('users.fields.licenseNumber')">
          <UInput
            v-model="form.licenseNumber"
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
