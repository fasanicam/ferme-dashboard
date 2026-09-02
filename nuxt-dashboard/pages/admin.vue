<template>
  <div class="max-w-5xl mx-auto space-y-8 pb-12">
    
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <span>🛠️</span>
          <span>Administration & Maintenance</span>
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gestion des modules enregistrés en base de données et nettoyage des données orphelines.
        </p>
      </div>

      <button
        @click="fetchModules"
        class="px-4 py-2 rounded-xl bg-white dark:bg-[#131D33] border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition-all flex items-center space-x-2 self-start shadow-sm"
      >
        <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />
        <span>Actualiser</span>
      </button>
    </div>

    <!-- Modules Management List -->
    <div class="space-y-4">
      <div
        v-for="(variables, module) in modulesData"
        :key="module"
        class="p-6 rounded-3xl bg-white dark:bg-[#131D33] border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div class="space-y-2">
          <div class="flex items-center space-x-3">
            <span class="text-xl">📦</span>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white capitalize">
              {{ String(module).replace(/_/g, ' ') }}
            </h3>
            <span class="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
              {{ variables.length }} variables
            </span>
          </div>

          <!-- Variable Pills -->
          <div class="flex flex-wrap gap-1.5 pt-1">
            <div
              v-for="v in variables"
              :key="v"
              class="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono flex items-center space-x-1.5"
            >
              <span class="text-slate-700 dark:text-slate-300">{{ v }}</span>
              <button
                @click="deleteVariable(String(module), v)"
                class="text-slate-400 hover:text-rose-500 transition-colors"
                title="Supprimer cette variable"
              >
                <X :size="12" />
              </button>
            </div>
          </div>
        </div>

        <!-- Action: Delete whole module -->
        <button
          @click="deleteModule(String(module))"
          class="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 transition-all flex items-center space-x-1.5 self-start md:self-center flex-shrink-0"
        >
          <Trash2 :size="14" />
          <span>Purger le module</span>
        </button>
      </div>

      <div v-if="Object.keys(modulesData).length === 0" class="p-12 text-center text-slate-400 bg-white dark:bg-[#131D33] rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
        Aucun module enregistré en base de données.
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { RefreshCw, Trash2, X } from 'lucide-vue-next'

const loading = ref(false)
const modulesData = ref<Record<string, string[]>>({})

onMounted(() => {
  fetchModules()
})

async function fetchModules() {
  loading.value = true
  try {
    const data = await $fetch<Record<string, string[]>>('/api/admin/modules')
    modulesData.value = data || {}
  } catch (err) {
    console.error('Erreur chargement admin modules:', err)
  } finally {
    loading.value = false
  }
}

async function deleteVariable(module: string, variable: string) {
  if (!confirm(`Supprimer définitivement la variable "${variable}" du module "${module}" ?`)) {
    return
  }

  try {
    await $fetch('/api/admin/delete-variable', {
      method: 'POST',
      body: { module, variable }
    })
    await fetchModules()
  } catch (err: any) {
    alert(`Erreur: ${err.message}`)
  }
}

async function deleteModule(module: string) {
  if (!confirm(`Supprimer définitivement tout le module "${module}" et son historique ?`)) {
    return
  }

  try {
    await $fetch('/api/admin/delete-module', {
      method: 'POST',
      body: { module }
    })
    await fetchModules()
  } catch (err: any) {
    alert(`Erreur: ${err.message}`)
  }
}
</script>
