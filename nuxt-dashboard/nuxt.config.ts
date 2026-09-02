// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
  ],

  css: [
    '~/assets/css/main.css'
  ],

  app: {
    head: {
      title: '🌱 Ferme Connectée — Dashboard IoT',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Dashboard IoT temps réel pour la surveillance des capteurs et modules de la ferme connectée.' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌱</text></svg>' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap' }
      ]
    }
  },

  runtimeConfig: {
    // Server-side only
    mqttBroker: process.env.NUXT_MQTT_BROKER || process.env.MQTT_BROKER || '127.0.0.1',
    mqttPort: parseInt(process.env.NUXT_MQTT_PORT || process.env.MQTT_PORT || '1883', 10),
    mqttTopic: process.env.NUXT_MQTT_TOPIC || process.env.MQTT_TOPIC || 'bzh/mecatro/#',
    dbHost: process.env.NUXT_DB_HOST || process.env.DB_HOST || '127.0.0.1',
    dbUser: process.env.NUXT_DB_USER || process.env.DB_USER || 'prof_bzh',
    dbPassword: process.env.NUXT_DB_PASSWORD || process.env.DB_PASSWORD || 'prof_bzh@root',
    dbName: process.env.NUXT_DB_NAME || process.env.DB_NAME || 'icambzh',
    sqlitePath: process.env.SQLITE_PATH || '../ferme.db',
    adminPassword: process.env.ADMIN_PASSWORD || 'jesuisdavid',
    
    // Public (client & server)
    public: {
      appName: 'Ferme Connectée Dashboard',
      version: '2.0.0'
    }
  },

  nitro: {
    experimental: {
      websocket: true
    }
  }
})
