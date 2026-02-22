<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  open: boolean
  message?: string
  loading?: boolean
}>()

defineEmits<{
  'update:open': [value: boolean]
  confirm: []
}>()
</script>

<template>
  <UModal
    :open="props.open"
    @update:open="$emit('update:open', $event)"
  >
    <template #header>
      <h3 class="text-lg font-semibold text-error">
        {{ t('common.delete') }}
      </h3>
    </template>
    <template #body>
      <p class="text-muted">
        {{ message }}
      </p>
      <div class="flex justify-end gap-3 pt-4">
        <UButton
          variant="ghost"
          @click="$emit('update:open', false)"
        >
          {{ t('common.cancel') }}
        </UButton>
        <UButton
          color="error"
          :loading="loading"
          @click="$emit('confirm')"
        >
          {{ t('common.delete') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
