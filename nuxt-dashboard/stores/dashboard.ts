// stores/dashboard.ts
import { defineStore } from 'pinia'

export interface SensorItem {
  valeur: string
  derniere_maj: string
  isHighlighted?: boolean
}

export interface RawMqttMessage {
  topic: string
  payload: string
  timestamp: string
  project?: string | null
  category?: string
  is_compliant?: boolean
}

export const useDashboardStore = defineStore('dashboard', () => {
  const dashboard = ref<Record<string, Record<string, SensorItem>>>({})
  const messages = ref<RawMqttMessage[]>([])
  const brokerConnected = ref(true)
  const brokerUrl = ref('')
  const sseConnected = ref(false)
  const searchQuery = ref('')
  const selectedModule = ref<string | null>(null)
  
  // Modals state
  const historyModal = ref<{
    isOpen: boolean
    module: string
    variable: string
  }>({
    isOpen: false,
    module: '',
    variable: ''
  })

  const rateLimitModalOpen = ref(false)

  // Sparkline history cache: Map<`${module}:${variable}`, number[]>
  const sparklines = ref<Record<string, number[]>>({})

  // Fetch initial dashboard state
  async function fetchInitialData() {
    try {
      const [dashRes, msgRes] = await Promise.all([
        $fetch<{ dashboard: Record<string, Record<string, { valeur: string; derniere_maj: string }>> }>('/api/dashboard/data'),
        $fetch<{ messages: RawMqttMessage[] }>('/api/dashboard/messages')
      ])

      if (dashRes && dashRes.dashboard) {
        dashboard.value = dashRes.dashboard
        // Fetch sparklines for all variables
        for (const mod of Object.keys(dashRes.dashboard)) {
          for (const varName of Object.keys(dashRes.dashboard[mod])) {
            fetchSparkline(mod, varName)
          }
        }
      }

      if (msgRes && msgRes.messages) {
        messages.value = msgRes.messages
      }
    } catch (err: any) {
      console.error('[Store] Erreur chargement initial:', err)
    }
  }

  // Fetch sparkline data (last 20 points)
  async function fetchSparkline(module: string, variable: string) {
    try {
      const key = `${module}:${variable}`
      const history = await $fetch<Array<[string, string]>>(`/api/history/${module}/${variable}?limit=20`)
      if (history && history.length > 0) {
        const numbers = history
          .map(h => parseFloat(h[0]))
          .filter(n => !isNaN(n))
        sparklines.value[key] = numbers
      }
    } catch {
      // Sparkline fetch fail is non-blocking
    }
  }

  // Handle incoming real-time SSE updates
  function handleUpdateData(payload: { module: string; variable: string; value: string; timestamp: string }) {
    const { module, variable, value, timestamp } = payload
    if (!dashboard.value[module]) {
      dashboard.value[module] = {}
    }

    dashboard.value[module][variable] = {
      valeur: value,
      derniere_maj: timestamp,
      isHighlighted: true
    }

    // Reset highlight after 2.5s
    setTimeout(() => {
      if (dashboard.value[module] && dashboard.value[module][variable]) {
        dashboard.value[module][variable].isHighlighted = false
      }
    }, 2500)

    // Update sparkline in-memory
    const key = `${module}:${variable}`
    const num = parseFloat(value)
    if (!isNaN(num)) {
      if (!sparklines.value[key]) {
        sparklines.value[key] = []
      }
      sparklines.value[key].push(num)
      if (sparklines.value[key].length > 20) {
        sparklines.value[key].shift()
      }
    }
  }

  function handleNewMessage(msg: RawMqttMessage) {
    messages.value.unshift(msg)
    if (messages.value.length > 100) {
      messages.value.pop()
    }
  }

  function handleDeleteData(payload: { module: string; variable?: string }) {
    const { module, variable } = payload
    if (variable && variable !== '*') {
      if (dashboard.value[module] && dashboard.value[module][variable]) {
        delete dashboard.value[module][variable]
        if (Object.keys(dashboard.value[module]).length === 0) {
          delete dashboard.value[module]
        }
      }
    } else {
      delete dashboard.value[module]
    }
  }

  function openHistory(module: string, variable: string) {
    historyModal.value = {
      isOpen: true,
      module,
      variable
    }
  }

  function closeHistory() {
    historyModal.value.isOpen = false
  }

  // Computed properties
  const modulesList = computed(() => Object.keys(dashboard.value).sort())

  const totalSensorsCount = computed(() => {
    let count = 0
    for (const mod of Object.values(dashboard.value)) {
      count += Object.keys(mod).length
    }
    return count
  })

  const filteredDashboard = computed(() => {
    const result: Record<string, Record<string, SensorItem>> = {}
    const query = searchQuery.value.toLowerCase().trim()

    for (const [mod, vars] of Object.entries(dashboard.value)) {
      if (selectedModule.value && selectedModule.value !== mod) {
        continue
      }

      const matchingVars: Record<string, SensorItem> = {}
      for (const [varName, item] of Object.entries(vars)) {
        if (!query || mod.toLowerCase().includes(query) || varName.toLowerCase().includes(query) || item.valeur.toLowerCase().includes(query)) {
          matchingVars[varName] = item
        }
      }

      if (Object.keys(matchingVars).length > 0) {
        result[mod] = matchingVars
      }
    }

    return result
  })

  return {
    dashboard,
    messages,
    brokerConnected,
    brokerUrl,
    sseConnected,
    searchQuery,
    selectedModule,
    historyModal,
    rateLimitModalOpen,
    sparklines,
    modulesList,
    totalSensorsCount,
    filteredDashboard,
    fetchInitialData,
    fetchSparkline,
    handleUpdateData,
    handleNewMessage,
    handleDeleteData,
    openHistory,
    closeHistory
  }
})
