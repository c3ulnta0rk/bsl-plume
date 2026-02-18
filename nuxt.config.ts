// https://nuxt.com/docs/api/configuration/nuxt-config
/// <reference types="node" />
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt',
    '@logto/nuxt',
    '@nuxthub/core'
  ],

  ssr: process.env.NODE_ENV === 'production',

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      logto: {
        appId: process.env.LOGTO_APP_ID,
        appSecret: process.env.LOGTO_APP_SECRET,
        baseUrl: process.env.LOGTO_BASE_URL
      },
      apiBase: '/api'
    }
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs',
        quotes: 'single',
        semi: false
      }
    }
  }
})
