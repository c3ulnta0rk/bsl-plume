<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { email, password, getError, showError, handleSubmit } = useAuthForm('signin')
const submitted = ref(false)

function onSubmit() {
  handleSubmit((payload) => {
    submitted.value = true
    // Front-only: just log or show toast; no API call
    console.info('Signin (front)', payload)
  })
}
</script>

<template>
  <UContainer class="py-16">
    <div class="max-w-sm mx-auto">
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold text-highlighted">
            Connexion
          </h2>
          <p class="text-sm text-muted mt-1">
            Entrez vos identifiants pour vous connecter.
          </p>
        </template>

        <form
          class="space-y-4"
          @submit.prevent="onSubmit"
        >
          <UFormField
            label="Email"
            required
            :error="getError('email') || undefined"
          >
            <UInput
              v-model="email"
              variant="subtle"
              type="email"
              placeholder="vous@exemple.fr"
              class="w-full"
              autocomplete="email"
              @blur="showError('email')"
            />
          </UFormField>

          <UFormField
            label="Mot de passe"
            required
            :error="getError('password') || undefined"
          >
            <UInput
              v-model="password"
              type="password"
              placeholder="••••••••"
              class="w-full"
              autocomplete="current-password"
              @blur="showError('password')"
            />
          </UFormField>

          <div class="flex flex-col gap-3 pt-2">
            <UButton
              type="submit"
              block
              size="lg"
            >
              Se connecter
            </UButton>
            <p class="text-center text-sm text-muted">
              Pas encore de compte ?
              <ULink
                to="/signup"
                class="text-primary hover:underline"
              >
                S'inscrire
              </ULink>
            </p>
          </div>
        </form>

        <template
          v-if="submitted"
          #footer
        >
          <UAlert
            color="success"
            title="Formulaire envoyé"
            description="En production, une requête d'authentification serait envoyée."
          />
        </template>
      </UCard>
    </div>
  </UContainer>
</template>
