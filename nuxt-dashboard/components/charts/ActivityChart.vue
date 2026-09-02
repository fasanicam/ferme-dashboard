<template>
  <div class="rounded-2xl bg-white dark:bg-[#131D33] border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center space-x-2">
        <div class="w-2.5 h-2.5 rounded-full bg-cyan-500"></div>
        <h3 class="text-base font-bold text-slate-900 dark:text-white">
          Activité globale (msg/min)
        </h3>
      </div>
      <span class="text-xs text-slate-400 font-mono">Dernière heure</span>
    </div>

    <div class="h-64 relative flex items-center justify-center">
      <div v-if="loading" class="text-slate-400 text-xs flex items-center space-x-2">
        <Loader2 class="animate-spin" :size="16" />
        <span>Chargement...</span>
      </div>
      <canvas v-show="!loading" ref="canvas" class="w-full h-full"></canvas>
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
import { Loader2 } from 'lucide-vue-next'

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

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null
const loading = ref(true)
let refreshTimer: any = null

onMounted(() => {
  fetchAndRender()
  refreshTimer = setInterval(fetchAndRender, 15000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (chart) chart.destroy()
})

async function fetchAndRender() {
  try {
    const data = await $fetch<Array<[string, number]>>('/api/stats/messages?limit=30')
    if (!data) return
    loading.value = false
    await nextTick()
    render(data)
  } catch (err) {
    console.error('Erreur ActivityChart:', err)
  } finally {
    loading.value = false
  }
}

function render(data: Array<[string, number]>) {
  if (!canvas.value) return
  const isDark = document.documentElement.classList.contains('dark')

  const labels = data.map(d => {
    try {
      const parts = d[0].split(' ')
      return parts[1] || d[0]
    } catch {
      return d[0]
    }
  })
  const values = data.map(d => d[1])

  if (chart) {
    chart.data.labels = labels
    chart.data.datasets[0].data = values
    chart.update('none')
    return
  }

  const ctx = canvas.value.getContext('2d')
  if (!ctx) return

  const gradient = ctx.createLinearGradient(0, 0, 0, 240)
  gradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)')
  gradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)')

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Messages / min',
          data: values,
          borderColor: '#06B6D4',
          borderWidth: 2,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: '#06B6D4',
          pointBorderColor: '#FFFFFF',
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
          padding: 8,
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: isDark ? '#64748B' : '#94A3B8',
            font: { size: 10 },
            maxTicksLimit: 6
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
