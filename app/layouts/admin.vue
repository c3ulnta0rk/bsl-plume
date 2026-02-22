<script setup lang="ts">
const { t } = useI18n()
const { loggedIn, user, clear } = useUserSession()
const loggingOut = ref(false)

const navItems = computed(() => [
  { label: t('nav.dashboard'), to: '/admin', icon: 'i-lucide-layout-dashboard' },
  { label: t('nav.clubs'), to: '/admin/clubs', icon: 'i-lucide-building-2' },
  { label: t('nav.users'), to: '/admin/users', icon: 'i-lucide-users' },
  { label: t('nav.tournaments'), to: '/admin/tournaments', icon: 'i-lucide-trophy' },
  { label: t('nav.categoryTypes'), to: '/admin/category-types', icon: 'i-lucide-tags' },
  { label: t('nav.teams'), to: '/admin/teams', icon: 'i-lucide-users-round' },
  { label: t('nav.matches'), to: '/admin/matches', icon: 'i-lucide-swords' }
])

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
  <div class="min-h-screen flex">
    <!-- Sidebar -->
    <aside class="w-64 border-r border-default bg-elevated flex flex-col shrink-0">
      <div class="p-4 border-b border-default">
        <NuxtLink
          to="/admin"
          class="flex items-center gap-2 font-semibold text-highlighted"
        >
          <AppLogo class="h-7 w-auto text-primary" />
          <span>{{ t('nav.admin') }}</span>
        </NuxtLink>
      </div>
      <nav class="flex-1 p-3 space-y-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:text-default hover:bg-accented transition-colors"
          active-class="!text-primary bg-primary/10 font-medium"
        >
          <UIcon
            :name="item.icon"
            class="size-5 shrink-0"
          />
          {{ item.label }}
        </NuxtLink>
      </nav>
      <div class="p-3 border-t border-default">
        <NuxtLink
          to="/"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:text-default hover:bg-accented transition-colors"
        >
          <UIcon
            name="i-lucide-arrow-left"
            class="size-5 shrink-0"
          />
          {{ t('nav.home') }}
        </NuxtLink>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Top bar -->
      <header class="h-14 border-b border-default flex items-center justify-end px-6 gap-4">
        <AdminLanguageSwitcher />
        <template v-if="loggedIn">
          <span class="text-sm text-muted">{{ user?.email }}</span>
          <UBadge
            :color="user?.role === 'admin' ? 'primary' : 'neutral'"
            variant="subtle"
            size="sm"
          >
            {{ user?.role }}
          </UBadge>
          <UButton
            variant="ghost"
            size="sm"
            icon="i-lucide-log-out"
            :loading="loggingOut"
            @click="logout"
          >
            {{ t('auth.logout') }}
          </UButton>
        </template>
      </header>
      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
