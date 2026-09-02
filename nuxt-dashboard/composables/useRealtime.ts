// composables/useRealtime.ts
import { useDashboardStore } from '../stores/dashboard'

export function useRealtime() {
  const store = useDashboardStore()
  let eventSource: EventSource | null = null
  let reconnectTimeout: any = null

  function connect() {
    if (!process.client) return
    if (eventSource) {
      eventSource.close()
    }

    try {
      eventSource = new EventSource('/api/sse')

      eventSource.onopen = () => {
        store.sseConnected = true
        console.log('[SSE Client] 🟢 Connecté au flux temps réel')
      }

      eventSource.addEventListener('connected', (e: MessageEvent) => {
        store.sseConnected = true
      })

      eventSource.addEventListener('broker_status', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          store.brokerConnected = data.connected
          if (data.broker) store.brokerUrl = data.broker
        } catch {}
      })

      eventSource.addEventListener('update_data', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          store.handleUpdateData(data)
        } catch {}
      })

      eventSource.addEventListener('new_message', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          store.handleNewMessage(data)
        } catch {}
      })

      eventSource.addEventListener('delete_data', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          store.handleDeleteData(data)
        } catch {}
      })

      eventSource.onerror = () => {
        store.sseConnected = false
        if (eventSource) {
          eventSource.close()
          eventSource = null
        }
        // Attempt reconnection after 3s
        if (!reconnectTimeout) {
          reconnectTimeout = setTimeout(() => {
            reconnectTimeout = null
            connect()
          }, 3000)
        }
      }
    } catch (err) {
      console.error('[SSE Client Error]:', err)
    }
  }

  function disconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    store.sseConnected = false
  }

  return { connect, disconnect }
}
