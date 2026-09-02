<template>
  <Teleport to="body">
    <div
      v-if="store.rateLimitModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all"
      @click.self="store.rateLimitModalOpen = false"
    >
      <div class="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-[#131D33] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <!-- Header -->
        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Timer :size="22" />
            </div>
            <div>
              <h2 class="text-xl font-bold text-slate-900 dark:text-white">
                Règle du Rate Limit (5s)
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Protection et optimisation de la base de données
              </p>
            </div>
          </div>

          <button
            @click="store.rateLimitModalOpen = false"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X :size="20" />
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 overflow-y-auto space-y-4 text-sm text-slate-600 dark:text-slate-300">
          
          <div class="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40">
            <h4 class="font-bold text-blue-900 dark:text-blue-300 mb-1 flex items-center gap-2">
              <span>📚</span> Définition
            </h4>
            <p class="text-blue-800 dark:text-blue-200/90 text-xs leading-relaxed">
              Le <strong>rate limiting</strong> limite la fréquence d'enregistrement en base de données à <strong>1 sauvegarde toutes les 5 secondes par variable</strong>, afin d'éviter la saturation du stockage et du réseau IoT.
            </p>
          </div>

          <div class="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40">
            <h4 class="font-bold text-emerald-900 dark:text-emerald-300 mb-1 flex items-center gap-2">
              <span>⚡</span> Comportement Temps Réel
            </h4>
            <p class="text-emerald-800 dark:text-emerald-200/90 text-xs leading-relaxed">
              Même si un message n'est pas sauvegardé en base de données car envoyé trop vite, <strong>il est instantanément affiché en direct sur le dashboard</strong> !
            </p>
          </div>

          <div class="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
            <h4 class="font-bold text-slate-800 dark:text-slate-200 mb-2 text-xs">Exemple d'exécution séquentielle :</h4>
            <div class="space-y-1 font-mono text-xs">
              <div class="text-emerald-600 dark:text-emerald-400">✓ 12:00:00 → temp = 20.1°C (Enregistré en BDD)</div>
              <div class="text-amber-600 dark:text-amber-400">✗ 12:00:02 → temp = 20.3°C (Affiché en direct, BDD ignorée)</div>
              <div class="text-amber-600 dark:text-amber-400">✗ 12:00:04 → temp = 20.5°C (Affiché en direct, BDD ignorée)</div>
              <div class="text-emerald-600 dark:text-emerald-400">✓ 12:00:05 → temp = 20.8°C (Enregistré en BDD)</div>
            </div>
          </div>

          <!-- Live Rate Limit Status -->
          <div v-if="liveStatus && Object.keys(liveStatus).length > 0" class="space-y-2 pt-2">
            <h4 class="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center justify-between">
              <span>Statut en direct des variables surveillées</span>
              <span class="font-normal text-slate-400 text-[10px]">Actualisé</span>
            </h4>
            <div class="max-h-48 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs" style="scrollbar-width: thin;">
              <template v-for="(items, mod) in liveStatus" :key="mod">
                <div v-for="item in items" :key="item.variable" class="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span class="truncate mr-2 text-slate-700 dark:text-slate-300">
                    {{ mod }}/{{ item.variable }}
                  </span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold" :class="item.is_limited ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'">
                    {{ item.is_limited ? `Limité (${item.seconds_since}s)` : `Prêt (${item.seconds_since}s)` }}
                  </span>
                </div>
              </template>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-900/30">
          <button
            @click="store.rateLimitModalOpen = false"
            class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-colors"
          >
            J'ai compris !
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { Timer, X } from 'lucide-vue-next'
import { useDashboardStore } from '../stores/dashboard'
import type { RateLimitItem } from '../server/utils/types'

const store = useDashboardStore()
const liveStatus = ref<Record<string, RateLimitItem[]>>({})

watch(() => store.rateLimitModalOpen, async (isOpen) => {
  if (isOpen) {
    try {
      const data = await $fetch<Record<string, RateLimitItem[]>>('/api/stats/rate-limit')
      if (data) liveStatus.value = data
    } catch {}
  }
})
</script>
