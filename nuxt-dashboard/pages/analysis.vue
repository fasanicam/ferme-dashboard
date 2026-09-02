<template>
  <div class="space-y-8 pb-12">
    
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <span>📊</span>
          <span>Analyse & Scoring MQTT</span>
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Évaluation de la conformité des topics IoT et monitoring des projets étudiants.
        </p>
      </div>

      <button
        @click="fetchAnalysis"
        class="px-4 py-2 rounded-xl bg-white dark:bg-[#131D33] border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition-all flex items-center space-x-2 self-start shadow-sm"
      >
        <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />
        <span>Actualiser l'analyse</span>
      </button>
    </div>

    <!-- Global Compliance KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      <!-- Card 1: Score & Compliance -->
      <div class="rounded-3xl p-6 bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg relative overflow-hidden">
        <div class="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10 blur-xl"></div>
        <span class="text-xs font-bold uppercase tracking-wider text-emerald-100">Conformité Globale</span>
        <div class="text-4xl font-extrabold mt-2 tracking-tight">
          {{ globalStats.compliance_rate }}%
        </div>
        <p class="text-xs text-emerald-100/90 mt-2">
          {{ globalStats.compliant_messages.toLocaleString() }} messages conformes sur {{ globalStats.total_messages.toLocaleString() }}
        </p>
      </div>

      <!-- Card 2: Messages Analysés -->
      <div class="rounded-3xl p-6 bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-lg relative overflow-hidden">
        <div class="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10 blur-xl"></div>
        <span class="text-xs font-bold uppercase tracking-wider text-cyan-100">Volume Total</span>
        <div class="text-4xl font-extrabold mt-2 tracking-tight">
          {{ globalStats.total_messages.toLocaleString() }}
        </div>
        <p class="text-xs text-cyan-100/90 mt-2">
          Ensemble des messages IoT analysés
        </p>
      </div>

      <!-- Card 3: Projets Actifs -->
      <div class="rounded-3xl p-6 bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-lg relative overflow-hidden">
        <div class="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10 blur-xl"></div>
        <span class="text-xs font-bold uppercase tracking-wider text-purple-100">Projets Actifs (24h)</span>
        <div class="text-4xl font-extrabold mt-2 tracking-tight">
          {{ globalStats.active_projects }}
        </div>
        <p class="text-xs text-purple-100/90 mt-2">
          Groupes ayant publié au moins une mesure
        </p>
      </div>

    </div>

    <!-- Category Distribution Breakdown -->
    <div class="p-6 rounded-3xl bg-white dark:bg-[#131D33] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
      <h3 class="text-base font-bold text-slate-900 dark:text-white">
        Répartition par Catégorie de Topics
      </h3>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          v-for="(count, cat) in globalStats.categories"
          :key="cat"
          class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800"
        >
          <span class="text-xs font-semibold text-slate-400 uppercase">{{ cat }}</span>
          <div class="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {{ count.toLocaleString() }}
          </div>
          <div class="text-[11px] text-slate-400 mt-0.5">
            {{ ((count / (globalStats.total_messages || 1)) * 100).toFixed(1) }}% du trafic
          </div>
        </div>
      </div>
    </div>

    <!-- Projects Quality Table -->
    <div class="p-6 rounded-3xl bg-white dark:bg-[#131D33] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-bold text-slate-900 dark:text-white">
            Tableau de Conformité des Projets
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cliquez sur une ligne pour inspecter les erreurs de nomenclature et le détail du projet.
          </p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <th class="py-3 px-4">Projet / Groupe</th>
              <th class="py-3 px-4">Messages</th>
              <th class="py-3 px-4">Conformes</th>
              <th class="py-3 px-4">Taux de Conformité</th>
              <th class="py-3 px-4">Note / Score</th>
              <th class="py-3 px-4">Dernière Activité</th>
              <th class="py-3 px-4 text-right">Détails</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
            <tr
              v-for="p in projects"
              :key="p.name"
              @click="openProjectDetails(p.name)"
              class="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
            >
              <td class="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" :class="p.score >= 90 ? 'bg-emerald-500' : (p.score >= 70 ? 'bg-amber-500' : 'bg-rose-500')"></span>
                <span>{{ p.name }}</span>
              </td>
              <td class="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                {{ p.total.toLocaleString() }}
              </td>
              <td class="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400">
                {{ p.compliant.toLocaleString() }}
              </td>
              <td class="py-3 px-4">
                <div class="flex items-center space-x-2">
                  <div class="w-24 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full"
                      :class="p.compliance_rate >= 90 ? 'bg-emerald-500' : (p.compliance_rate >= 70 ? 'bg-amber-500' : 'bg-rose-500')"
                      :style="{ width: `${p.compliance_rate}%` }"
                    ></div>
                  </div>
                  <span class="font-mono text-xs">{{ p.compliance_rate }}%</span>
                </div>
              </td>
              <td class="py-3 px-4">
                <span
                  class="px-2.5 py-1 rounded-full text-xs font-bold font-mono"
                  :class="getGradeBadgeClass(p.score)"
                >
                  {{ getGrade(p.score) }} ({{ p.score }}/100)
                </span>
              </td>
              <td class="py-3 px-4 text-xs text-slate-400 font-mono">
                {{ formatTimeAgo(p.last_seen) }}
              </td>
              <td class="py-3 px-4 text-right text-slate-400 group-hover:text-emerald-600 transition-colors">
                <ChevronRight :size="18" class="inline" />
              </td>
            </tr>

            <tr v-if="projects.length === 0">
              <td colspan="7" class="py-12 text-center text-slate-400">
                Aucun projet répertorié dans l'historique MQTT.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ===== AMBIANCE COMPLIANCE SECTION ===== -->
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span>🌡️</span>
            <span>Conformité Ambiance (Données Partagées)</span>
          </h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Validation du format JSON normalisé sur <code class="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">bzh/mecatro/ambiance/&lt;GROUPE&gt;/&lt;GRANDEUR&gt;</code>
          </p>
        </div>
      </div>

      <!-- Ambiance Global KPIs -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6" v-if="ambianceStats">
        <div class="rounded-3xl p-6 bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-lg relative overflow-hidden">
          <div class="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10 blur-xl"></div>
          <span class="text-xs font-bold uppercase tracking-wider text-violet-100">Conformité JSON</span>
          <div class="text-4xl font-extrabold mt-2 tracking-tight">{{ ambianceStats.global.compliance_rate }}%</div>
          <p class="text-xs text-violet-100/90 mt-2">
            {{ ambianceStats.global.compliant.toLocaleString() }} payloads JSON valides sur {{ ambianceStats.global.total.toLocaleString() }}
          </p>
        </div>
        <div class="rounded-3xl p-6 bg-gradient-to-br from-fuchsia-600 to-pink-700 text-white shadow-lg relative overflow-hidden">
          <div class="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10 blur-xl"></div>
          <span class="text-xs font-bold uppercase tracking-wider text-fuchsia-100">Grandeurs Actives</span>
          <div class="text-4xl font-extrabold mt-2 tracking-tight">{{ ambianceStats.global.active_grandeurs }}</div>
          <p class="text-xs text-fuchsia-100/90 mt-2">Types de mesures publiés sur l'espace ambiance</p>
        </div>
        <div class="rounded-3xl p-6 bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-lg relative overflow-hidden">
          <div class="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10 blur-xl"></div>
          <span class="text-xs font-bold uppercase tracking-wider text-indigo-100">Groupes Participants</span>
          <div class="text-4xl font-extrabold mt-2 tracking-tight">{{ ambianceStats.global.active_groupes }}</div>
          <p class="text-xs text-indigo-100/90 mt-2">Groupes ayant publié au moins une mesure d'ambiance</p>
        </div>
      </div>

      <!-- Per-Grandeur Breakdown -->
      <div v-if="ambianceStats" class="space-y-4">
        <div
          v-for="g in ambianceStats.grandeurs"
          :key="g.grandeur"
          class="p-6 rounded-3xl bg-white dark:bg-[#131D33] border border-slate-200/80 dark:border-slate-800/80 shadow-sm"
        >
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <span class="px-3 py-1 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-mono text-sm font-bold">{{ g.grandeur }}</span>
              <span class="text-xs text-slate-400">unité : <code class="font-mono">{{ g.unite }}</code> — type : <code class="font-mono">{{ g.type }}</code></span>
            </div>
            <div class="flex items-center gap-3">
              <span v-if="g.total === 0" class="text-xs text-slate-400 italic">Aucun message reçu</span>
              <template v-else>
                <div class="flex items-center gap-2">
                  <div class="w-24 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full"
                      :class="g.compliance_rate >= 90 ? 'bg-emerald-500' : (g.compliance_rate >= 70 ? 'bg-amber-500' : 'bg-rose-500')"
                      :style="{ width: `${g.compliance_rate}%` }"
                    ></div>
                  </div>
                  <span class="font-mono text-sm font-bold" :class="g.compliance_rate >= 90 ? 'text-emerald-600 dark:text-emerald-400' : (g.compliance_rate >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400')">
                    {{ g.compliance_rate }}%
                  </span>
                </div>
                <span class="text-xs text-slate-400">{{ g.total }} msgs</span>
              </template>
            </div>
          </div>

          <!-- Groupes within this grandeur -->
          <div v-if="Object.keys(g.groupes).length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div
              v-for="(gr, gname) in g.groupes"
              :key="gname"
              class="p-3 rounded-2xl border"
              :class="gr.compliance_rate >= 90 ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900' : (gr.compliance_rate >= 70 ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900' : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900')"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-bold text-sm text-slate-900 dark:text-white">{{ gname }}</span>
                <span class="font-mono text-xs font-bold" :class="gr.compliance_rate >= 90 ? 'text-emerald-600 dark:text-emerald-400' : (gr.compliance_rate >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400')">
                  {{ gr.compliance_rate }}%
                </span>
              </div>
              <div class="flex items-center justify-between text-xs text-slate-400">
                <span>{{ gr.compliant }}/{{ gr.total }} conformes</span>
                <span v-if="gr.last_value !== null" class="font-mono font-semibold text-slate-600 dark:text-slate-300">
                  {{ gr.last_value }} {{ g.unite }}
                </span>
              </div>
              <p v-if="gr.last_seen" class="text-[10px] text-slate-400 mt-1">{{ formatTimeAgo(gr.last_seen) }}</p>
            </div>
          </div>
          <div v-else class="text-xs text-slate-400 italic">
            Aucun groupe n'a encore publié sur cette grandeur.
          </div>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="ambianceLoading" class="py-12 text-center text-slate-400 flex items-center justify-center space-x-2">
        <Loader2 class="animate-spin" :size="20" />
        <span>Chargement des données ambiance...</span>
      </div>
    </div>

    <!-- Project Details Modal -->
    <div
      v-if="selectedProjectModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      @click.self="selectedProjectModal = null"
    >
      <div class="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-[#131D33] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        <!-- Header -->
        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>🔎</span>
              <span>Projet : {{ selectedProjectModal }}</span>
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Rapport d'analyse et erreurs de nomenclature
            </p>
          </div>

          <button
            @click="selectedProjectModal = null"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X :size="20" />
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 overflow-y-auto space-y-6 text-sm">
          <div v-if="detailsLoading" class="py-12 text-center text-slate-400 flex items-center justify-center space-x-2">
            <Loader2 class="animate-spin" :size="20" />
            <span>Chargement des détails...</span>
          </div>

          <div v-else-if="projectDetails" class="space-y-6">
            
            <!-- Errors breakdown -->
            <div class="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
              <h4 class="font-bold text-rose-900 dark:text-rose-300 mb-2 flex items-center gap-2">
                <AlertTriangle :size="16" />
                <span>Topics non conformes détectés ({{ projectDetails.errors.length }})</span>
              </h4>
              
              <div v-if="projectDetails.errors.length > 0" class="space-y-2">
                <div
                  v-for="(err, i) in projectDetails.errors"
                  :key="i"
                  class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 font-mono text-xs flex items-center justify-between"
                >
                  <span class="text-rose-600 dark:text-rose-400 font-semibold truncate">{{ err.topic }}</span>
                  <span class="text-slate-400 ml-2 flex-shrink-0">{{ err.count }} fois</span>
                </div>
              </div>
              <div v-else class="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                ✨ Aucune erreur de structure détectée ! Tous les messages respectent la nomenclature.
              </div>
            </div>

            <!-- Top Topics -->
            <div>
              <h4 class="font-bold text-slate-900 dark:text-white mb-3">Topics les plus actifs</h4>
              <div class="space-y-2 font-mono text-xs">
                <div
                  v-for="(t, i) in projectDetails.top_topics"
                  :key="i"
                  class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <span class="text-slate-800 dark:text-slate-200 font-semibold truncate">{{ t.topic }}</span>
                  <span class="text-indigo-600 dark:text-indigo-400 font-bold ml-2">{{ t.count }} msgs</span>
                </div>
              </div>
            </div>

            <!-- Recent Messages -->
            <div>
              <h4 class="font-bold text-slate-900 dark:text-white mb-3">Derniers messages reçus</h4>
              <div class="space-y-2 font-mono text-xs">
                <div
                  v-for="(m, i) in projectDetails.recent_messages"
                  :key="i"
                  class="p-2.5 rounded-xl border flex items-center justify-between"
                  :class="m.is_compliant ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800' : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900'"
                >
                  <div class="truncate mr-2">
                    <span class="font-semibold text-slate-800 dark:text-slate-200">{{ m.topic }}</span>
                    <span class="mx-2 text-slate-400">→</span>
                    <span class="text-emerald-600 dark:text-emerald-400 font-bold">{{ m.payload }}</span>
                  </div>
                  <span class="text-slate-400 text-[10px] flex-shrink-0">{{ formatTimeAgo(m.timestamp) }}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { RefreshCw, ChevronRight, X, Loader2, AlertTriangle } from 'lucide-vue-next'
import type { GlobalMqttStats, ProjectAnalysis, ProjectDetails } from '../server/utils/types'
import { useTimeAgo } from '../composables/useTimeAgo'

const { formatTimeAgo } = useTimeAgo()

// ---- Ambiance Analysis ----
const ambianceLoading = ref(false)
const ambianceStats = ref<any>(null)

async function fetchAmbianceAnalysis() {
  ambianceLoading.value = true
  try {
    ambianceStats.value = await $fetch('/api/ambiance/analysis')
  } catch (err) {
    console.error('Erreur chargement analyse ambiance:', err)
  } finally {
    ambianceLoading.value = false
  }
}

const loading = ref(false)
const detailsLoading = ref(false)
const selectedProjectModal = ref<string | null>(null)
const projectDetails = ref<ProjectDetails | null>(null)

const globalStats = ref<GlobalMqttStats>({
  total_messages: 0,
  compliant_messages: 0,
  non_compliant_messages: 0,
  compliance_rate: 100,
  active_projects: 0,
  categories: {},
  unknown_traffic: 0
})

const projects = ref<ProjectAnalysis[]>([])

onMounted(() => {
  fetchAnalysis()
  fetchAmbianceAnalysis()
})

async function fetchAnalysis() {
  loading.value = true
  try {
    const [globalData, projectsData] = await Promise.all([
      $fetch<GlobalMqttStats>('/api/mqtt/global'),
      $fetch<ProjectAnalysis[]>('/api/mqtt/projects')
    ])

    if (globalData) globalStats.value = globalData
    if (projectsData) projects.value = projectsData
  } catch (err) {
    console.error('Erreur chargement analyse:', err)
  } finally {
    loading.value = false
    // Reload ambiance at the same time
    fetchAmbianceAnalysis()
  }
}

async function openProjectDetails(projectName: string) {
  selectedProjectModal.value = projectName
  detailsLoading.value = true
  try {
    const details = await $fetch<ProjectDetails>(`/api/mqtt/project/${encodeURIComponent(projectName)}`)
    projectDetails.value = details
  } catch (err) {
    console.error('Erreur détails projet:', err)
  } finally {
    detailsLoading.value = false
  }
}

function getGrade(score: number): string {
  if (score >= 95) return 'A+'
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

function getGradeBadgeClass(score: number): string {
  if (score >= 90) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
  if (score >= 70) return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
  return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
}
</script>
