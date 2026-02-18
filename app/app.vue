<script setup>
useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: {
    lang: 'fr'
  }
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>

<style lang="scss">
html {
  min-height: 100vh;
}
body {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
main {
  flex: 1;
}
</style>
