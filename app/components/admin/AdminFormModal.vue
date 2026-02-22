<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  open: boolean
  title: string
  loading?: boolean
}>()

defineEmits<{
  'update:open': [value: boolean]
  submit: []
}>()
</script>

<template>
  <UModal
    :open="props.open"
    @update:open="$emit('update:open', $event)"
  >
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ title }}
      </h3>
    </template>
    <template #body>
      <form
        class="space-y-4"
        @submit.prevent="$emit('submit')"
      >
        <slot />
        <div class="flex justify-end gap-3 pt-2">
          <UButton
            variant="ghost"
            @click="$emit('update:open', false)"
          >
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            type="submit"
            :loading="loading"
          >
            {{ t('common.save') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
