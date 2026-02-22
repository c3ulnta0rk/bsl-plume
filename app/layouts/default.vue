<script setup lang="ts">
const { t } = useI18n()
const { loggedIn, user, clear } = useUserSession()
const { isAdmin } = useAdminAuth()
const loggingOut = ref(false)

async function logout() {
  loggingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clear()
    await navigateTo('/')
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-default">
      <UContainer class="flex h-14 items-center justify-between">
        <ULink
          to="/"
          class="flex items-center gap-2 font-semibold"
        >
          <AppLogo class="h-8 w-auto text-primary" />
        </ULink>
        <nav class="flex items-center gap-4">
          <ULink
            to="/"
            class="text-muted hover:text-default transition-colors"
          >
            {{ t('nav.home') }}
          </ULink>
          <ULink
            to="/tournaments"
            class="text-muted hover:text-default transition-colors"
          >
            {{ t('nav.tournaments') }}
          </ULink>
          <template v-if="loggedIn">
            <ULink
              v-if="isAdmin"
              to="/admin"
              class="text-muted hover:text-default transition-colors"
            >
              {{ t('nav.admin') }}
            </ULink>
            <span class="text-sm text-muted">{{ user?.email }}</span>
            <UButton
              variant="ghost"
              size="sm"
              :loading="loggingOut"
              :disabled="loggingOut"
              @click="logout"
            >
              {{ t('auth.logout') }}
            </UButton>
          </template>
          <template v-else>
            <ULink
              to="/signin"
              variant="ghost"
              size="sm"
            >
              {{ t('auth.login') }}
            </ULink>
            <UButton
              to="/signup"
              size="sm"
            >
              {{ t('auth.register') }}
            </UButton>
          </template>
        </nav>
      </UContainer>
    </header>
    <main class="flex-1">
      <slot />
    </main>
    <footer class="border-t border-default py-6 text-center text-sm text-muted">
      <UContainer>
        {{ t('footer.rights', { year: new Date().getFullYear() }) }}
      </UContainer>
    </footer>
  </div>
</template>
