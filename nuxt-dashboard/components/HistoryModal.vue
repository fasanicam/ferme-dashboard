<template>
  <div
    v-if="store.historyModal.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all"
    @click.self="store.closeHistory"
  >
    <div class="relative w-full max-w-4xl rounded-3xl bg-white dark:bg-[#131D33] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      
      <!-- Modal Header -->
      <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <LineChart :size="22" />
          </div>
          <div>
            <h2 class="text-xl font-bold text-slate-900 dark:text-white capitalize">
              {{ store.historyModal.module.replace(/_/g, ' ') }} — {{ store.historyModal.variable.replace(/_/g, ' ') }}
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              Topic: bzh/mecatro/dashboard/{{ store.historyModal.module }}/{{ store.historyModal.variable }}
            </p>
          </div>
        </div>

        <button
          @click="store.closeHistory"
          class="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X :size="20" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 overflow-y-auto space-y-6">
        
        <!-- Controls: Period Selector & CSV Export -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          
          <div class="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs font-medium">
            <button
              v-for="p in periods"
              :key="p.limit"
              @click="setLimit(p.limit)"
              class="px-3 py-1.5 rounded-lg transition-all"
              :class="currentLimit === p.limit ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'"
            >
              {{ p.label }}
            </button>
          </div>

          <button
            @click="exportCsv"
            :disabled="historyData.length === 0"
            class="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center space-x-1.5 disabled:opacity-50"
          >
            <Download :size="14" />
            <span>Exporter CSV</span>
          </button>
        </div>

        <!-- Quick Stats Strip -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Actuelle</span>
            <div class="text-xl font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
              {{ latestValue }}
            </div>
          </div>

          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Minimum</span>
            <div class="text-xl font-bold text-cyan-600 dark:text-cyan-400 mt-0.5 font-mono">
              {{ stats.min !== null ? stats.min : '-' }}
            </div>
          </div>

          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Maximum</span>
            <div class="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5 font-mono">
              {{ stats.max !== null ? stats.max : '-' }}
            </div>
          </div>

          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Moyenne</span>
            <div class="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
              {{ stats.avg !== null ? stats.avg : '-' }}
            </div>
          </div>
        </div>

        <!-- Chart Container -->
        <div class="rounded-2xl p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 h-80 relative flex items-center justify-center">
          <div v-if="loading" class="text-slate-400 text-sm flex items-center space-x-2">
            <Loader2 class="animate-spin" :size="20" />
            <span>Chargement de l'historique...</span>
          </div>
          <div v-else-if="historyData.length === 0" class="text-slate-400 text-sm">
            Aucun historique enregistré pour ce capteur.
          </div>
          <canvas v-show="!loading && historyData.length > 0" ref="chartCanvas" class="w-full h-full"></canvas>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { LineChart, X, Download, Loader2 } from 'lucide-vue-next'
import { useDashboardStore } from '../stores/dashboard'

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler
)

const store = useDashboardStore()
const chartCanvas = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

const currentLimit = ref(100)
const loading = ref(false)
const historyData = ref<Array<[string, string]>>([])

const periods = [
  { label: '50 pts', limit: 50 },
  { label: '100 pts', limit: 100 },
  { label: '300 pts', limit: 300 },
  { label: '1 000 pts', limit: 1000 }
]

const latestValue = computed(() => {
  const mod = store.dashboard[store.historyModal.module]
  if (mod && mod[store.historyModal.variable]) {
    return mod[store.historyModal.variable].valeur
  }
  if (historyData.value.length > 0) {
    return historyData.value[historyData.value.length - 1][0]
  }
  return '-'
})

const numericValues = computed(() => {
  return historyData.value
    .map(h => parseFloat(h[0]))
    .filter(v => !isNaN(v))
})

const stats = computed(() => {
  const vals = numericValues.value
  if (vals.length === 0) return { min: null, max: null, avg: null }
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const sum = vals.reduce((a, b) => a + b, 0)
  const avg = Number((sum / vals.length).toFixed(2))
  return { min, max, avg }
})

watch(() => store.historyModal.isOpen, (open) => {
  if (open) {
    fetchHistory()
  } else {
    if (chartInstance) {
      chartInstance.destroy()
      chartInstance = null
    }
  }
})

function setLimit(limit: number) {
  currentLimit.value = limit
  fetchHistory()
}

async function fetchHistory() {
  if (!store.historyModal.module || !store.historyModal.variable) return
  loading.value = true

  try {
    const data = await $fetch<Array<[string, string]>>(
      `/api/history/${store.historyModal.module}/${store.historyModal.variable}?limit=${currentLimit.value}`
    )
    historyData.value = data || []
    await nextTick()
    renderChart()
  } catch (err) {
    console.error('Erreur chargement historique:', err)
  } finally {
    loading.value = false
  }
}

function renderChart() {
  if (!chartCanvas.value) return
  if (chartInstance) {
    chartInstance.destroy()
  }

  const isDark = document.documentElement.classList.contains('dark')
  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return

  // Gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 300)
  gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)')
  gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)')

  const labels = historyData.value.map(h => {
    try {
      const d = new Date(h[1])
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      return h[1]
    }
  })

  const values = historyData.value.map(h => {
    const val = parseFloat(h[0])
    return isNaN(val) ? null : val
  })

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: `${store.historyModal.module}/${store.historyModal.variable}`,
          data: values,
          borderColor: '#10B981',
          borderWidth: 2.5,
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          pointRadius: values.length > 50 ? 0 : 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#10B981',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 1.5,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          titleColor: isDark ? '#F1F5F9' : '#0F172A',
          bodyColor: isDark ? '#94A3B8' : '#334155',
          borderColor: isDark ? '#334155' : '#E2E8F0',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: isDark ? '#64748B' : '#94A3B8',
            font: { size: 10 },
            maxTicksLimit: 8
          }
        },
        y: {
          grid: {
            color: isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.8)'
          },
          ticks: {
            color: isDark ? '#64748B' : '#94A3B8',
            font: { size: 10 }
          }
        }
      }
    }
  })
}

function exportCsv() {
  if (historyData.value.length === 0) return
  let csv = 'timestamp,valeur\n'
  historyData.value.forEach(([val, ts]) => {
    csv += `"${ts}","${val}"\n`
  })

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ferme_${store.historyModal.module}_${store.historyModal.variable}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
