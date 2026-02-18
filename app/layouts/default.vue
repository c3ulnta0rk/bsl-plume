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
            Accueil
          </ULink>
          <ULink
            to="/signin"
            variant="ghost"
            size="sm"
          >
            Connexion
          </ULink>
          <UButton
            to="/signup"
            size="sm"
          >
            Inscription
          </UButton>
        </nav>
      </UContainer>
    </header>
    <main class="flex-1">
      <slot />
    </main>
    <footer class="border-t border-default py-6 text-center text-sm text-muted">
      <UContainer>
        &copy; {{ new Date().getFullYear() }} — Tous droits réservés
      </UContainer>
    </footer>
  </div>
</template>
