<template>
  <div class="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-200">
    <Navbar />
    
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <NuxtPage />
    </main>

    <!-- Global Modals (accessible across all pages & navbar) -->
    <HistoryModal />
    <RateLimitInfoModal />

    <footer class="mt-auto border-t border-slate-200/80 dark:border-slate-800/80 py-6 text-center text-xs text-slate-400">
      <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>🌱 <strong>Ferme Connectée</strong> — Dashboard IoT & Supervision MQTT</span>
        <span>Développé par <strong>David Fasani</strong></span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useDashboardStore } from './stores/dashboard'
import { useRealtime } from './composables/useRealtime'
import Navbar from './components/Navbar.vue'
import HistoryModal from './components/HistoryModal.vue'
import RateLimitInfoModal from './components/RateLimitInfoModal.vue'

const store = useDashboardStore()
const { connect } = useRealtime()

onMounted(async () => {
  await store.fetchInitialData()
  connect()
})
</script>
