<template>
  <div class="space-y-8 pb-12">
    
    <!-- Hero / Top Bar -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <span>🌱</span>
          <span>Supervision Ferme & IoT</span>
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Surveillance en temps réel des modules, capteurs et actionneurs de l'écosystème.
        </p>
      </div>

      <!-- Search & Filters -->
      <div class="flex items-center space-x-3">
        <!-- Search Input -->
        <div class="relative w-full sm:w-64">
          <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" :size="16" />
          <input
            v-model="store.searchQuery"
            type="text"
            placeholder="Rechercher un capteur..."
            class="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-[#131D33] border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
        </div>

        <!-- Refresh Button -->
        <button
          @click="refreshData"
          class="p-2.5 rounded-xl bg-white dark:bg-[#131D33] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500 shadow-sm transition-all flex items-center justify-center"
          :class="{ 'animate-spin': isRefreshing }"
          title="Actualiser les données"
        >
          <RefreshCw :size="18" />
        </button>
      </div>
    </div>

    <!-- KPI Strip -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricStatCard
        title="Modules Actifs"
        :value="activeModulesCount"
        subtitle="systèmes connectés"
        :icon="Cpu"
        variant="emerald"
      />
      <MetricStatCard
        title="Capteurs Surveillés"
        :value="store.totalSensorsCount"
        subtitle="variables temps réel"
        :icon="Layers"
        variant="cyan"
      />
      <MetricStatCard
        title="Messages Reçus"
        :value="store.messages.length"
        subtitle="sur le flux récent"
        :icon="Zap"
        variant="purple"
      />
      <MetricStatCard
        title="Conformité MQTT"
        :value="complianceRate + '%'"
        subtitle="topics conformes"
        :icon="ShieldCheck"
        variant="blue"
      />
    </div>

    <!-- Module Filter Chips -->
    <div v-if="store.modulesList.length > 0" class="flex items-center space-x-2 overflow-x-auto pb-1" style="scrollbar-width: none;">
      <button
        @click="store.selectedModule = null"
        class="px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
        :class="store.selectedModule === null
          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
          : 'bg-white dark:bg-[#131D33] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'"
      >
        Tous les modules ({{ store.modulesList.length }})
      </button>

      <button
        v-for="mod in store.modulesList"
        :key="mod"
        @click="store.selectedModule = mod"
        class="px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all capitalize"
        :class="store.selectedModule === mod
          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
          : 'bg-white dark:bg-[#131D33] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'"
      >
        {{ mod.replace(/_/g, ' ') }} ({{ Object.keys(store.dashboard[mod] || {}).length }})
      </button>
    </div>

    <!-- Sensor Modules Grid -->
    <div>
      <div v-if="Object.keys(store.filteredDashboard).length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <ModuleCard
          v-for="(vars, mod) in store.filteredDashboard"
          :key="mod"
          :module="String(mod)"
          :variables="vars"
        />
      </div>

      <!-- Empty State -->
      <div
        v-else
        class="rounded-3xl p-12 text-center bg-white dark:bg-[#131D33] border border-dashed border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <div class="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
          🌱
        </div>
        <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100">
          En attente de messages MQTT
        </h3>
        <p class="text-xs text-slate-400 max-w-md mx-auto mt-1">
          Aucun module n'a encore publié de données sur <code class="font-mono text-emerald-600 dark:text-emerald-400">bzh/mecatro/dashboard/#</code> ou votre filtre ne correspond à aucun capteur.
        </p>
      </div>
    </div>

    <!-- Charts & Live Feed Section -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
      <div class="space-y-6 lg:col-span-2">
        <ActivityChart />
        <PublicationTrendsChart />
      </div>

      <div class="lg:col-span-1 h-full min-h-[420px]">
        <LiveFeed />
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import {
  Search,
  RefreshCw,
  Cpu,
  Layers,
  Zap,
  ShieldCheck
} from 'lucide-vue-next'
import { useDashboardStore } from '../stores/dashboard'
import MetricStatCard from '../components/MetricStatCard.vue'
import ModuleCard from '../components/ModuleCard.vue'
import LiveFeed from '../components/LiveFeed.vue'
import ActivityChart from '../components/charts/ActivityChart.vue'
import PublicationTrendsChart from '../components/charts/PublicationTrendsChart.vue'

const store = useDashboardStore()
const isRefreshing = ref(false)

const activeModulesCount = computed(() => {
  return Object.keys(store.dashboard).length
})

const complianceRate = computed(() => {
  if (store.messages.length === 0) return 100
  const compliant = store.messages.filter(m => m.is_compliant !== false).length
  return Math.round((compliant / store.messages.length) * 100)
})

async function refreshData() {
  isRefreshing.value = true
  await store.fetchInitialData()
  setTimeout(() => {
    isRefreshing.value = false
  }, 400)
}
</script>
