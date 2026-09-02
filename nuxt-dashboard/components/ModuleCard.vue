<template>
  <div class="rounded-2xl bg-white dark:bg-[#131D33] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group overflow-hidden">
    
    <!-- Module Header -->
    <div class="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
      <div class="flex items-center space-x-2.5">
        <div class="w-8 h-8 rounded-lg bg-eco-100 dark:bg-eco-950 flex items-center justify-center text-eco-600 dark:text-eco-400 font-bold text-sm">
          {{ moduleIcon }}
        </div>
        <div>
          <h3 class="text-base font-bold text-slate-800 dark:text-slate-100 capitalize">
            {{ formattedModuleName }}
          </h3>
          <span class="text-xs text-slate-400 font-medium">
            {{ variableCount }} {{ variableCount > 1 ? 'capteurs' : 'capteur' }}
          </span>
        </div>
      </div>

      <!-- Delete Module Button -->
      <button
        @click="deleteMod"
        class="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 opacity-0 group-hover:opacity-100 transition-all"
        title="Supprimer ce module entier"
      >
        <Trash2 :size="16" />
      </button>
    </div>

    <!-- Variables List -->
    <div class="p-3 space-y-1 overflow-y-auto max-h-96" style="scrollbar-width: thin;">
      <VariableRow
        v-for="(item, varName) in variables"
        :key="varName"
        :module="module"
        :variable="String(varName)"
        :item="item"
      />
    </div>

  </div>
</template>

<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'
import type { SensorItem } from '../stores/dashboard'
import { useDashboardStore } from '../stores/dashboard'

const props = defineProps<{
  module: string
  variables: Record<string, SensorItem>
}>()

const store = useDashboardStore()

const formattedModuleName = computed(() => {
  return props.module.replace(/_/g, ' ')
})

const variableCount = computed(() => {
  return Object.keys(props.variables).length
})

const moduleIcon = computed(() => {
  const name = props.module.toLowerCase()
  if (name.includes('serre')) return '🌿'
  if (name.includes('ruche') || name.includes('abeille')) return '🐝'
  if (name.includes('irrig') || name.includes('eau') || name.includes('pompe')) return '💧'
  if (name.includes('meteo') || name.includes('climat')) return '⛅'
  if (name.includes('lumiere') || name.includes('eclairage')) return '💡'
  if (name.includes('porte') || name.includes('securite')) return '🚪'
  if (name.includes('poulailler')) return '🐔'
  if (name.includes('sol')) return '🌱'
  return '📦'
})

async function deleteMod() {
  if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement le module "${props.module}" et tous ses capteurs ?`)) {
    return
  }

  try {
    await $fetch('/api/admin/delete-module', {
      method: 'POST',
      body: { module: props.module }
    })
    store.handleDeleteData({ module: props.module })
  } catch (err: any) {
    alert(`Erreur: ${err.message}`)
  }
}
</script>
