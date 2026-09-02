<template>
  <div
    class="py-3 px-3 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 group/row"
    :class="{ 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/30 transition-all duration-300': item.isHighlighted }"
  >
    <div class="flex items-center justify-between gap-2 mb-1.5">
      
      <!-- Variable Name -->
      <div class="flex items-center space-x-2 min-w-0">
        <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
        <span class="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate capitalize" :title="variable">
          {{ formattedName }}
        </span>
      </div>

      <!-- Value + Action Buttons -->
      <div class="flex items-center space-x-2 flex-shrink-0">
        
        <!-- Live Value Badge -->
        <span
          class="font-mono text-base font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 transition-colors"
          :class="{ 'text-emerald-600 dark:text-emerald-400 font-extrabold': item.isHighlighted }"
        >
          {{ item.valeur }}
        </span>

        <!-- History Chart Button -->
        <button
          @click="openChart"
          class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
          title="Afficher l'historique et statistiques"
        >
          <LineChart :size="16" />
        </button>

        <!-- Delete Variable Button -->
        <button
          @click="deleteVar"
          class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 opacity-0 group-hover/row:opacity-100 transition-all"
          title="Supprimer cette variable"
        >
          <Trash2 :size="15" />
        </button>
      </div>

    </div>

    <!-- Sparkline preview & Timestamp -->
    <div class="grid grid-cols-3 items-center gap-2 mt-1">
      <div class="col-span-2">
        <SparklineChart :data="sparklineData" :id="`${module}_${variable}`" />
      </div>
      <div class="text-right text-[11px] text-slate-400 dark:text-slate-500 font-mono">
        {{ formatTimeAgo(item.derniere_maj) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LineChart, Trash2 } from 'lucide-vue-next'
import type { SensorItem } from '../stores/dashboard'
import { useDashboardStore } from '../stores/dashboard'
import { useTimeAgo } from '../composables/useTimeAgo'

const props = defineProps<{
  module: string
  variable: string
  item: SensorItem
}>()

const store = useDashboardStore()
const { formatTimeAgo } = useTimeAgo()

const formattedName = computed(() => {
  return props.variable.replace(/_/g, ' ')
})

const sparklineData = computed(() => {
  const key = `${props.module}:${props.variable}`
  return store.sparklines[key] || []
})

function openChart() {
  store.openHistory(props.module, props.variable)
}

async function deleteVar() {
  if (!confirm(`Supprimer la variable "${props.variable}" du module "${props.module}" ?`)) {
    return
  }

  try {
    await $fetch('/api/admin/delete-variable', {
      method: 'POST',
      body: { module: props.module, variable: props.variable }
    })
    store.handleDeleteData({ module: props.module, variable: props.variable })
  } catch (err: any) {
    alert(`Erreur: ${err.message}`)
  }
}
</script>
