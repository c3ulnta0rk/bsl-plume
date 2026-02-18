<template>
  <UContainer class="py-16">
    <div class="text-center space-y-8">
      <h1 class="text-4xl font-bold text-highlighted">
        Bienvenue
      </h1>
      <p class="text-lg text-muted max-w-xl mx-auto">
        Connectez-vous ou créez un compte pour continuer.
      </p>
      <div class="flex flex-wrap justify-center gap-4">
        <UButton to="/signin" size="lg" variant="outline" trailing-icon="i-lucide-log-in">
          Connexion
        </UButton>
        <UButton to="/signup" size="lg" trailing-icon="i-lucide-user-plus">
          Inscription
        </UButton>
      </div>
    </div>
  </UContainer>
</template>
