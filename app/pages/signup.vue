<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { email, password, confirmPassword, getError, showError, handleSubmit } = useAuthForm('signup')
const { fetch: fetchSession } = useUserSession()
const loading = ref(false)
const errorMessage = ref('')

async function onSubmit() {
  errorMessage.value = ''
  handleSubmit(async (payload) => {
    loading.value = true
    try {
      await $fetch('/api/auth/register', {
        method: 'POST',
        body: payload
      })
      await fetchSession()
      await navigateTo('/')
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      errorMessage.value = err?.data?.message ?? 'Une erreur est survenue.'
    } finally {
      loading.value = false
    }
  })
}
</script>

<template>
  <UContainer class="py-16">
    <div class="max-w-sm mx-auto">
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold text-highlighted">
            Inscription
          </h2>
          <p class="text-sm text-muted mt-1">
            Créez un compte pour continuer.
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
              autocomplete="new-password"
              @blur="showError('password')"
            />
          </UFormField>

          <UFormField
            label="Confirmer le mot de passe"
            required
            :error="getError('confirmPassword') || undefined"
          >
            <UInput
              v-model="confirmPassword"
              type="password"
              placeholder="••••••••"
              class="w-full"
              autocomplete="new-password"
              @blur="showError('confirmPassword')"
            />
          </UFormField>

          <div class="flex flex-col gap-3 pt-2">
            <UButton
              type="submit"
              block
              size="lg"
              :loading="loading"
              :disabled="loading"
            >
              S'inscrire
            </UButton>
            <p class="text-center text-sm text-muted">
              Déjà un compte ?
              <ULink
                to="/signin"
                class="text-primary hover:underline"
              >
                Se connecter
              </ULink>
            </p>
          </div>
        </form>

        <template
          v-if="errorMessage"
          #footer
        >
          <UAlert
            color="error"
            title="Erreur"
            :description="errorMessage"
          />
        </template>
      </UCard>
    </div>
  </UContainer>
</template>
