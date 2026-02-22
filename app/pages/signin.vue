<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { t } = useI18n()
const { email, password, getError, showError, handleSubmit } = useAuthForm('signin')
const { fetch: fetchSession } = useUserSession()
const loading = ref(false)
const errorMessage = ref('')

async function onSubmit() {
  errorMessage.value = ''
  handleSubmit(async (payload) => {
    loading.value = true
    try {
      await $fetch('/api/auth/login', {
        method: 'POST',
        body: payload
      })
      await fetchSession()
      await navigateTo('/admin')
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }, statusCode?: number }
      errorMessage.value = err?.data?.message ?? t('auth.genericError')
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
            {{ t('auth.loginTitle') }}
          </h2>
          <p class="text-sm text-muted mt-1">
            {{ t('auth.loginSubtitle') }}
          </p>
        </template>

        <form
          class="space-y-4"
          @submit.prevent="onSubmit"
        >
          <UFormField
            :label="t('auth.emailLabel')"
            required
            :error="getError('email') || undefined"
          >
            <UInput
              v-model="email"
              variant="subtle"
              type="email"
              :placeholder="t('auth.emailPlaceholder')"
              class="w-full"
              autocomplete="email"
              @blur="showError('email')"
            />
          </UFormField>

          <UFormField
            :label="t('auth.passwordLabel')"
            required
            :error="getError('password') || undefined"
          >
            <UInput
              v-model="password"
              type="password"
              :placeholder="t('auth.passwordPlaceholder')"
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
              :loading="loading"
              :disabled="loading"
            >
              {{ t('auth.submitLogin') }}
            </UButton>
            <p class="text-center text-sm text-muted">
              {{ t('auth.noAccount') }}
              <ULink
                to="/signup"
                class="text-primary hover:underline"
              >
                {{ t('auth.register') }}
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
            :title="t('auth.error')"
            :description="errorMessage"
          />
        </template>
      </UCard>
    </div>
  </UContainer>
</template>
