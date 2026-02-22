<script setup lang="ts">
defineProps<{
  title: string
  actionLabel?: string
  actionIcon?: string
  showAction?: boolean
}>()

defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-highlighted">
        {{ title }}
      </h1>
      <slot name="breadcrumbs" />
    </div>
    <div class="flex gap-2">
      <slot name="actions" />
      <UButton
        v-if="showAction && actionLabel"
        :icon="actionIcon"
        @click="$emit('action')"
      >
        {{ actionLabel }}
      </UButton>
    </div>
  </div>
</template>
