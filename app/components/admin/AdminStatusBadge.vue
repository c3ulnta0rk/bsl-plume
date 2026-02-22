<script setup lang="ts">
const props = defineProps<{
  status: string
}>()

const colorMap: Record<string, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'neutral',
  pending: 'warning',
  published: 'success',
  archived: 'neutral',
  in_progress: 'info',
  completed: 'success'
}

const badgeColor = computed(() => colorMap[props.status] ?? 'neutral')
</script>

<template>
  <UBadge
    :color="badgeColor"
    variant="subtle"
    size="sm"
  >
    {{ status }}
  </UBadge>
</template>
