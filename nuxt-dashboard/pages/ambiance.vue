<template>
  <div class="max-w-5xl mx-auto space-y-8 pb-16">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <span>🌡️</span>
          <span>Monitoring Ambiance</span>
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Données d'ambiance partagées, organisées par grandeur physique.
        </p>
      </div>

      <div class="flex items-center gap-3 flex-wrap">
        <!-- Window selector -->
        <div class="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold">
          <button v-for="w in timeWindows" :key="w.hours"
            @click="selectedHours = w.hours; fetchAll()"
            :class="selectedHours === w.hours
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
            class="px-3 py-1.5 rounded-lg transition-all"
          >{{ w.label }}</button>
        </div>

        <!-- Live badge -->
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border"
          :class="isLive ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300' : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-700'"
        >
          <span class="relative flex h-2 w-2">
            <span v-if="isLive" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2" :class="isLive ? 'bg-emerald-500' : 'bg-slate-400'"></span>
          </span>
          <span>{{ isLive ? 'AUTO-REFRESH 15s' : 'PAUSED' }}</span>
        </div>

        <!-- Show empty toggle -->
        <button @click="showEmpty = !showEmpty"
          class="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
          :class="showEmpty ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-400'"
        >{{ showEmpty ? '🙈 Masquer vides' : '👁️ Voir toutes' }}</button>

        <!-- Manual refresh -->
        <button @click="fetchAll()"
          :disabled="loading"
          class="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-50"
          title="Rafraîchir"
        >
          <RefreshCw :size="15" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div v-for="stat in summaryStats" :key="stat.label"
        class="p-4 rounded-2xl bg-white dark:bg-[#131D33] border border-slate-200/80 dark:border-slate-800/80 shadow-sm"
      >
        <div class="text-2xl mb-1">{{ stat.icon }}</div>
        <div class="text-2xl font-extrabold text-slate-900 dark:text-white">{{ stat.value }}</div>
        <div class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{{ stat.label }}</div>
      </div>
    </div>

    <!-- No data state -->
    <div v-if="!loading && visibleGrandeurs.length === 0"
      class="text-center py-16 text-slate-400 dark:text-slate-600"
    >
      <div class="text-5xl mb-4">📡</div>
      <p class="font-semibold text-lg">Aucune donnée d'ambiance reçue</p>
      <p class="text-sm mt-1">Publiez sur <code class="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">bzh/mecatro/ambiance/&lt;groupe&gt;/&lt;grandeur&gt;</code> pour commencer.</p>
    </div>

    <!-- Accordion by grandeur -->
    <div class="space-y-4">
      <div
        v-for="g in visibleGrandeurs"
        :key="g.grandeur"
        class="rounded-3xl bg-white dark:bg-[#131D33] border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden transition-all"
      >
        <!-- Grandeur Header -->
        <button
          @click="toggleGrandeur(g.grandeur)"
          class="w-full flex items-center justify-between gap-4 px-6 py-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-left"
        >
          <div class="flex items-center gap-4">
            <div class="text-3xl w-10 text-center select-none">{{ g.icon }}</div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-extrabold text-slate-900 dark:text-white text-lg capitalize">{{ g.grandeur }}</span>
                <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">{{ g.unite }}</span>
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {{ Object.keys(g.groupes).length }} groupe{{ Object.keys(g.groupes).length > 1 ? 's' : '' }}
                <template v-if="g.minVal !== null">
                  · min <strong class="text-slate-700 dark:text-slate-300">{{ fmt(g.minVal) }}</strong>
                  · moy <strong class="text-slate-700 dark:text-slate-300">{{ fmt(g.avgVal) }}</strong>
                  · max <strong class="text-slate-700 dark:text-slate-300">{{ fmt(g.maxVal) }}</strong>
                </template>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <!-- Group badges -->
            <div class="hidden sm:flex flex-wrap gap-1.5">
              <span
                v-for="(gd, gname) in g.groupes" :key="gname"
                class="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                :style="`background: ${groupeColor(gname, 0.15)}; color: ${groupeColor(gname, 1)}; border: 1px solid ${groupeColor(gname, 0.4)}`"
              >
                {{ gname }}
                <span class="font-mono ml-1">{{ gd.last_value !== null ? fmt(gd.last_value) + ' ' + g.unite : '—' }}</span>
              </span>
            </div>
            <ChevronDown :size="18" class="text-slate-400 transition-transform duration-300"
              :class="openGrandeurs.has(g.grandeur) ? 'rotate-180' : ''"
            />
          </div>
        </button>

        <!-- Expanded content -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-[2000px]"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 max-h-[2000px]"
          leave-to-class="opacity-0 max-h-0"
        >
          <div v-if="openGrandeurs.has(g.grandeur)" class="border-t border-slate-100 dark:border-slate-800/60">
            <div class="p-6 space-y-6">

              <!-- Chart multi-lignes -->
              <div v-if="historyData[g.grandeur] && Object.keys(historyData[g.grandeur]).length > 0"
                class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800"
              >
                <div class="flex items-center justify-between mb-3">
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Historique {{ selectedHoursLabel }}</span>
                  <div class="flex flex-wrap gap-2">
                    <span v-for="(_, gname) in historyData[g.grandeur]" :key="gname"
                      class="flex items-center gap-1.5 text-xs font-semibold"
                    >
                      <span class="w-3 h-3 rounded-full inline-block" :style="`background: ${groupeColor(gname, 1)}`"></span>
                      {{ gname }}
                    </span>
                  </div>
                </div>
                <canvas :ref="el => setChartRef(el, g.grandeur)" class="w-full" style="height: 180px; max-height: 180px"></canvas>
              </div>
              <div v-else class="text-center py-8 text-slate-400 dark:text-slate-600 text-sm">
                <span class="text-2xl">📊</span>
                <p class="mt-2">Pas d'historique sur {{ selectedHoursLabel }}</p>
              </div>

              <!-- Cards par groupe -->
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                  v-for="(gd, gname) in g.groupes"
                  :key="gname"
                  class="p-4 rounded-2xl border transition-all"
                  :style="`border-color: ${groupeColor(gname, 0.35)}; background: ${groupeColor(gname, 0.06)}`"
                >
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-bold uppercase tracking-wider" :style="`color: ${groupeColor(gname, 0.9)}`">
                      {{ gname }}
                    </span>
                    <span class="px-1.5 py-0.5 text-[10px] font-bold rounded"
                      :class="gd.compliance_rate >= 90
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : gd.compliance_rate >= 70
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'"
                    >
                      {{ gd.compliance_rate }}% ✓
                    </span>
                  </div>

                  <div class="text-3xl font-extrabold text-slate-900 dark:text-white font-mono leading-none">
                    {{ gd.last_value !== null ? fmt(gd.last_value) : '—' }}
                    <span class="text-base font-semibold text-slate-500 dark:text-slate-400">{{ g.unite }}</span>
                  </div>

                  <div class="mt-2 text-[11px] text-slate-500 dark:text-slate-500 flex items-center gap-1">
                    <Clock :size="10" />
                    <span>{{ gd.last_seen ? timeAgo(gd.last_seen) : 'jamais' }}</span>
                    <span class="ml-auto font-mono">{{ gd.total }} msgs</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </Transition>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { RefreshCw, ChevronDown, Clock } from 'lucide-vue-next'
import { Chart, LineController, LineElement, PointElement, LinearScale, TimeScale, Filler, Tooltip, CategoryScale } from 'chart.js'

Chart.register(LineController, LineElement, PointElement, LinearScale, TimeScale, Filler, Tooltip, CategoryScale)

useHead({ title: 'Monitoring Ambiance — Ferme Connectée' })

// ---- Time windows ----
const timeWindows = [
  { hours: 1,  label: '1h' },
  { hours: 6,  label: '6h' },
  { hours: 24, label: '24h' },
  { hours: 72, label: '3j' },
]
const selectedHours = ref(6)
const selectedHoursLabel = computed(() => timeWindows.find(w => w.hours === selectedHours.value)?.label || '6h')

// ---- State ----
const loading    = ref(false)
const showEmpty  = ref(false)
const isLive     = ref(true)
const openGrandeurs = ref(new Set<string>())

type GroupeStat = {
  groupe: string
  total: number
  compliant: number
  compliance_rate: number
  last_seen: string | null
  last_value: any
}
type GrandeurStat = {
  grandeur: string
  unite: string
  type: string
  total: number
  compliant: number
  compliance_rate: number
  groupes: Record<string, GroupeStat>
}
type AnalysisResponse = {
  grandeurs: GrandeurStat[]
}

const analysisData = ref<GrandeurStat[]>([])
const historyData = ref<Record<string, Record<string, Array<{ t: string; v: number | null }>>>> ({})

// ---- Grandeur metadata ----
const GRANDEUR_META: Record<string, { icon: string; color: string }> = {
  temperature:  { icon: '🌡️', color: '#ef4444' },
  humidite:     { icon: '💧', color: '#3b82f6' },
  pression:     { icon: '🌬️', color: '#8b5cf6' },
  luminosite:   { icon: '☀️', color: '#f59e0b' },
  co2:          { icon: '🌿', color: '#10b981' },
  qualite_air:  { icon: '🫧', color: '#06b6d4' },
  bruit:        { icon: '🔊', color: '#f97316' },
  pluvio:       { icon: '⛅', color: '#64748b' },
  vent_vitesse: { icon: '💨', color: '#0ea5e9' },
}

// Palette of colors for groupes
const GROUPE_PALETTE = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#a855f7'
]
const groupeColorCache = new Map<string, string>()
let groupeColorIdx = 0
function groupeColor(name: string, alpha = 1): string {
  if (!groupeColorCache.has(name)) {
    groupeColorCache.set(name, GROUPE_PALETTE[groupeColorIdx++ % GROUPE_PALETTE.length])
  }
  const hex = groupeColorCache.get(name)!
  if (alpha === 1) return hex
  // Convert hex to rgba
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ---- Computed ----
const enrichedGrandeurs = computed(() =>
  analysisData.value.map(g => {
    const meta = GRANDEUR_META[g.grandeur] || { icon: '📊', color: '#64748b' }
    
    // Check if we have time-series points in historyData for this grandeur
    const sMap = historyData.value[g.grandeur]
    let allVals: number[] = []
    
    if (sMap && Object.keys(sMap).length > 0) {
      // Gather all historical data points across all groupes
      allVals = Object.values(sMap)
        .flat()
        .map(pt => pt.v)
        .filter((v): v is number => v !== null && v !== undefined && !isNaN(Number(v)))
    }
    
    // Fallback to the latest value of each group if history has no points yet
    if (allVals.length === 0) {
      allVals = Object.values(g.groupes)
        .map(gd => gd.last_value)
        .filter((v): v is number => v !== null && v !== undefined && !isNaN(Number(v)))
        .map(Number)
    }

    return {
      ...g,
      icon: meta.icon,
      color: meta.color,
      minVal: allVals.length ? Math.min(...allVals) : null,
      maxVal: allVals.length ? Math.max(...allVals) : null,
      avgVal: allVals.length ? allVals.reduce((a, b) => a + b, 0) / allVals.length : null,
    }
  })
)

const visibleGrandeurs = computed(() =>
  enrichedGrandeurs.value.filter(g => showEmpty.value || g.total > 0 || Object.keys(g.groupes).length > 0)
)

const summaryStats = computed(() => {
  const active = enrichedGrandeurs.value.filter(g => g.total > 0)
  const totalGroupes = active.reduce((s,g) => s + Object.keys(g.groupes).length, 0)
  const totalMsgs = active.reduce((s,g) => s + g.total, 0)
  const globalRate = totalMsgs > 0
    ? Math.round(active.reduce((s,g) => s + g.compliant, 0) / totalMsgs * 100)
    : 100
  return [
    { icon: '📡', value: active.length, label: 'Grandeurs actives' },
    { icon: '🏷️', value: totalGroupes, label: 'Groupes' },
    { icon: '📨', value: totalMsgs.toLocaleString('fr-FR'), label: 'Messages total' },
    { icon: '✅', value: globalRate + '%', label: 'Conformité globale' },
  ]
})

// ---- Fetch ----
async function fetchAnalysis() {
  const res = await $fetch<AnalysisResponse>('/api/ambiance/analysis')
  analysisData.value = res.grandeurs
}

async function fetchHistory(grandeur: string) {
  try {
    const res = await $fetch<{ series: Record<string, Array<{ t: string; v: number | null }>> }>(
      `/api/ambiance/history?grandeur=${grandeur}&hours=${selectedHours.value}&limit=500`
    )
    historyData.value[grandeur] = res.series
    nextTick(() => renderChart(grandeur))
  } catch (e) {
    console.warn('[Ambiance] history fetch failed for', grandeur, e)
  }
}

async function fetchAll() {
  loading.value = true
  try {
    await fetchAnalysis()
    for (const g of openGrandeurs.value) {
      await fetchHistory(g)
    }
  } finally {
    loading.value = false
  }
}

// ---- Accordion ----
async function toggleGrandeur(name: string) {
  if (openGrandeurs.value.has(name)) {
    openGrandeurs.value.delete(name)
    destroyChart(name)
  } else {
    openGrandeurs.value.add(name)
    await fetchHistory(name)
  }
}

// ---- Charts ----
const chartRefs = new Map<string, HTMLCanvasElement>()
const chartInstances = new Map<string, Chart>()

function setChartRef(el: any, grandeur: string) {
  if (el && el instanceof HTMLCanvasElement) {
    chartRefs.set(grandeur, el)
    renderChart(grandeur)
  }
}

function destroyChart(grandeur: string) {
  chartInstances.get(grandeur)?.destroy()
  chartInstances.delete(grandeur)
}

function renderChart(grandeur: string) {
  const canvas = chartRefs.get(grandeur)
  if (!canvas) return
  const series = historyData.value[grandeur]
  if (!series || Object.keys(series).length === 0) return

  destroyChart(grandeur)

  const datasets = Object.entries(series).map(([gname, points]) => ({
    label: gname,
    data: points.map(p => ({ x: p.t, y: p.v })),
    borderColor: groupeColor(gname, 1),
    backgroundColor: groupeColor(gname, 0.08),
    borderWidth: 2,
    pointRadius: points.length > 100 ? 0 : 2,
    pointHoverRadius: 4,
    fill: Object.keys(series).length === 1,
    tension: 0.3,
  }))

  // Build union of all labels sorted
  const allTimestamps = [...new Set(
    Object.values(series).flat().map(p => p.t)
  )].sort()

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: allTimestamps,
      datasets: datasets.map(ds => ({
        ...ds,
        data: allTimestamps.map(t => {
          const pt = (series[ds.label] || []).find(p => p.t === t)
          return pt ? pt.v : null
        })
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      spanGaps: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => {
              const raw = items[0]?.label || ''
              try { return new Date(raw).toLocaleString('fr-FR') } catch { return raw }
            }
          }
        }
      },
      scales: {
        x: {
          type: 'category',
          ticks: {
            maxTicksLimit: 8,
            maxRotation: 0,
            color: '#94a3b8',
            font: { size: 10 },
            callback: (_val, idx) => {
              const ts = allTimestamps[idx]
              if (!ts) return ''
              try {
                const d = new Date(ts)
                return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
              } catch { return '' }
            }
          },
          grid: { color: 'rgba(148,163,184,0.1)' }
        },
        y: {
          ticks: { color: '#94a3b8', font: { size: 10 } },
          grid: { color: 'rgba(148,163,184,0.1)' }
        }
      }
    }
  })
  chartInstances.set(grandeur, chart)
}

// ---- Helpers ----
function fmt(v: any): string {
  if (v === null || v === undefined) return '—'
  const n = Number(v)
  if (isNaN(n)) return String(v)
  return n % 1 === 0 ? String(n) : n.toFixed(2)
}

function timeAgo(isoStr: string): string {
  const diff = (Date.now() - new Date(isoStr).getTime()) / 1000
  if (diff < 60) return `il y a ${Math.round(diff)}s`
  if (diff < 3600) return `il y a ${Math.round(diff/60)}min`
  if (diff < 86400) return `il y a ${Math.round(diff/3600)}h`
  return `il y a ${Math.round(diff/86400)}j`
}

// ---- Lifecycle ----
let refreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await fetchAll()
  // Auto-open grandeurs that have data
  for (const g of analysisData.value) {
    if (g.total > 0 || Object.keys(g.groupes).length > 0) {
      openGrandeurs.value.add(g.grandeur)
      await fetchHistory(g.grandeur)
    }
  }
  refreshTimer = setInterval(() => {
    if (isLive.value) fetchAll()
  }, 15000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  for (const chart of chartInstances.values()) chart.destroy()
})
</script>
