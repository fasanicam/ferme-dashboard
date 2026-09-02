<template>
  <div class="rounded-2xl bg-white dark:bg-[#131D33] border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center space-x-2">
        <div class="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
        <h3 class="text-base font-bold text-slate-900 dark:text-white">
          Publications par heure (12h)
        </h3>
      </div>
      <span class="text-xs text-slate-400 font-mono">Par module</span>
    </div>

    <div class="h-64 relative flex items-center justify-center">
      <div v-if="loading" class="text-slate-400 text-xs flex items-center space-x-2">
        <Loader2 class="animate-spin" :size="16" />
        <span>Chargement...</span>
      </div>
      <div v-else-if="!hasData" class="text-slate-400 text-xs">
        Aucune donnée horaire disponible
      </div>
      <canvas v-show="!loading && hasData" ref="canvas" class="w-full h-full"></canvas>
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
  Legend
} from 'chart.js'
import { Loader2 } from 'lucide-vue-next'

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend
)

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null
const loading = ref(true)
const hasData = ref(false)
let refreshTimer: any = null

const colors = [
  '#10B981', // emerald
  '#06B6D4', // cyan
  '#8B5CF6', // purple
  '#F59E0B', // amber
  '#EC4899', // pink
  '#3B82F6', // blue
  '#F97316'  // orange
]

onMounted(() => {
  fetchAndRender()
  refreshTimer = setInterval(fetchAndRender, 30000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (chart) chart.destroy()
})

async function fetchAndRender() {
  try {
    const data = await $fetch<Array<[string, string, number]>>('/api/stats/publications?hours=12')
    if (!data || data.length === 0) {
      hasData.value = false
      loading.value = false
      return
    }

    hasData.value = true
    loading.value = false
    await nextTick()
    render(data)
  } catch (err) {
    console.error('Erreur PublicationTrendsChart:', err)
  } finally {
    loading.value = false
  }
}

function render(data: Array<[string, string, number]>) {
  if (!canvas.value) return
  const isDark = document.documentElement.classList.contains('dark')

  // Group by module and hour
  const moduleData: Record<string, Record<string, number>> = {}
  const allHours = new Set<string>()

  data.forEach(([mod, hour, count]) => {
    if (!moduleData[mod]) moduleData[mod] = {}
    moduleData[mod][hour] = count
    allHours.add(hour)
  })

  const sortedHours = Array.from(allHours).sort()
  const labels = sortedHours.map(h => {
    try {
      return h.split(' ')[1] || h
    } catch {
      return h
    }
  })

  const datasets = Object.keys(moduleData).map((mod, idx) => {
    const color = colors[idx % colors.length]
    const values = sortedHours.map(h => moduleData[mod][h] || 0)
    return {
      label: mod,
      data: values,
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2,
      tension: 0.35,
      pointRadius: 3,
      pointHoverRadius: 5,
    }
  })

  if (chart) {
    chart.data.labels = labels
    chart.data.datasets = datasets
    chart.update('none')
    return
  }

  const ctx = canvas.value.getContext('2d')
  if (!ctx) return

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: isDark ? '#94A3B8' : '#64748B',
            font: { size: 11 },
            usePointStyle: true,
            boxWidth: 6
          }
        },
        tooltip: {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          titleColor: isDark ? '#F1F5F9' : '#0F172A',
          bodyColor: isDark ? '#94A3B8' : '#334155',
          borderColor: isDark ? '#334155' : '#E2E8F0',
          borderWidth: 1,
          padding: 8,
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: isDark ? '#64748B' : '#94A3B8',
            font: { size: 10 }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: isDark ? 'rgba(51, 65, 85, 0.25)' : 'rgba(226, 232, 240, 0.7)'
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
</script>
