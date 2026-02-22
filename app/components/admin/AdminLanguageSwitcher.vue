<script setup lang="ts">
const { locale, locales } = useI18n()

const availableLocales = computed(() =>
  locales.value.filter(l => typeof l !== 'string')
)
</script>

<template>
  <USelect
    v-model="locale"
    :items="availableLocales.map(l => ({ label: l.name, value: l.code }))"
    size="sm"
    class="w-28"
  />
</template>
