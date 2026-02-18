// https://nuxt.com/docs/api/configuration/nuxt-config
/// <reference types="node" />
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt',
    'nuxt-auth-utils',
    '@nuxthub/core'
  ],

  ssr: process.env.NODE_ENV === 'production',

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiBase: '/api'
    }
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  hub: {
    db: {
      dialect: 'postgresql',
      connection: {
        connectionString: process.env.DATABASE_URL
      },
      casing: 'snake_case'
    }
  },

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
