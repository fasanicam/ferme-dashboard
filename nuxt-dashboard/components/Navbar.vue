<template>
  <header class="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        
        <!-- Logo & Title -->
        <div class="flex items-center space-x-3">
          <NuxtLink to="/" class="flex items-center space-x-3 group">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-eco-600 to-emerald-400 flex items-center justify-center shadow-md shadow-eco-500/20 group-hover:scale-105 transition-transform">
              <span class="text-2xl animate-float select-none">🌱</span>
            </div>
            <div>
              <span class="text-lg font-bold bg-gradient-to-r from-eco-600 via-emerald-500 to-teal-600 dark:from-eco-400 dark:to-teal-300 bg-clip-text text-transparent">
                Ferme Connectée
              </span>
            </div>
          </NuxtLink>
        </div>

        <!-- Navigation Tabs -->
        <nav class="hidden md:flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-medium">
          <NuxtLink
            to="/"
            class="px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5"
            :class="route.path === '/' ? 'bg-white dark:bg-slate-800 text-eco-600 dark:text-eco-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
          >
            <Activity :size="16" />
            <span>Dashboard</span>
          </NuxtLink>

          <NuxtLink
            to="/analysis"
            class="px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5"
            :class="route.path === '/analysis' ? 'bg-white dark:bg-slate-800 text-eco-600 dark:text-eco-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
          >
            <BarChart3 :size="16" />
            <span>Analyse MQTT</span>
          </NuxtLink>

          <NuxtLink
            to="/sandbox"
            class="px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5"
            :class="route.path === '/sandbox' ? 'bg-white dark:bg-slate-800 text-eco-600 dark:text-eco-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
          >
            <Terminal :size="16" />
            <span>Sandbox</span>
          </NuxtLink>
        </nav>

        <!-- Right Side Actions: Live indicator, Rate Limit info, Theme Switcher -->
        <div class="flex items-center space-x-3">
          
          <!-- Live Status Indicator -->
          <div
            class="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold border transition-all"
            :class="store.sseConnected
              ? 'bg-eco-50 border-eco-200 text-eco-700 dark:bg-eco-950/60 dark:border-eco-800/80 dark:text-eco-300'
              : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/60 dark:border-rose-800/80 dark:text-rose-300'"
            :title="store.sseConnected ? 'Flux temps réel connecté' : 'Flux déconnecté (reconnexion...)'"
          >
            <span class="relative flex h-2 w-2">
              <span
                v-if="store.sseConnected"
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-eco-400 opacity-75"
              ></span>
              <span
                class="relative inline-flex rounded-full h-2 w-2"
                :class="store.sseConnected ? 'bg-eco-500' : 'bg-rose-500'"
              ></span>
            </span>
            <span>{{ store.sseConnected ? 'LIVE' : 'OFFLINE' }}</span>
          </div>

          <!-- Rate limit modal trigger -->
          <button
            @click="store.rateLimitModalOpen = true"
            class="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Qu'est-ce que le Rate Limit 5s ?"
          >
            <Timer :size="19" />
          </button>

          <!-- Theme Toggle -->
          <button
            @click="theme.toggleTheme"
            class="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            :title="theme.isDark.value ? 'Passer en mode clair' : 'Passer en mode sombre'"
          >
            <Sun v-if="theme.isDark.value" :size="19" class="text-amber-400" />
            <Moon v-else :size="19" class="text-slate-600" />
          </button>
        </div>

      </div>
    </div>

    <!-- Mobile Nav Bar -->
    <div class="md:hidden flex items-center justify-around py-2 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 text-xs">
      <NuxtLink to="/" class="flex flex-col items-center py-1 px-3 rounded-lg" :class="route.path === '/' ? 'text-eco-500 font-bold' : 'text-slate-500'">
        <Activity :size="18" />
        <span>Dashboard</span>
      </NuxtLink>
      <NuxtLink to="/analysis" class="flex flex-col items-center py-1 px-3 rounded-lg" :class="route.path === '/analysis' ? 'text-eco-500 font-bold' : 'text-slate-500'">
        <BarChart3 :size="18" />
        <span>Analyse</span>
      </NuxtLink>
      <NuxtLink to="/sandbox" class="flex flex-col items-center py-1 px-3 rounded-lg" :class="route.path === '/sandbox' ? 'text-eco-500 font-bold' : 'text-slate-500'">
        <Terminal :size="18" />
        <span>Sandbox</span>
      </NuxtLink>
    </div>
  </header>
</template>

<script setup lang="ts">
import {
  Activity,
  BarChart3,
  Terminal,
  Sun,
  Moon,
  Timer
} from 'lucide-vue-next'
import { useDashboardStore } from '../stores/dashboard'
import { useTheme } from '../composables/useTheme'

const route = useRoute()
const store = useDashboardStore()
const theme = useTheme()
</script>
