// server/utils/state.ts
import type { DashboardData, MqttMessageRecord, RateLimitItem, AmbianceData } from './types'

// In-memory state for real-time performance
export const dashboardData: DashboardData = {}
export const ambianceData: AmbianceData = {}
export const lastMessages: MqttMessageRecord[] = []
export const MAX_LAST_MESSAGES = 100

// Rate limit: 5 seconds per module:variable
export const RATE_LIMIT_SECONDS = 5
export const lastSaveTime: Map<string, number> = new Map()
export const lastValueCache: Map<string, string> = new Map()
export const moduleMessageCount: Map<string, number> = new Map()

// SSE Clients for real-time live push
export interface SseClient {
  id: string
  send: (event: string, data: any) => void
  close: () => void
}

const sseClients = new Map<string, SseClient>()

export function registerSseClient(client: SseClient) {
  sseClients.set(client.id, client)
  console.log(`[SSE] 🟢 Client connecté (${client.id}). Total: ${sseClients.size}`)
}

export function unregisterSseClient(clientId: string) {
  sseClients.delete(clientId)
  console.log(`[SSE] 🔴 Client déconnecté (${clientId}). Total: ${sseClients.size}`)
}

export function broadcastSse(event: string, data: any) {
  for (const client of sseClients.values()) {
    try {
      client.send(event, data)
    } catch {
      sseClients.delete(client.id)
    }
  }
}

export function getRateLimitStatus(): Record<string, RateLimitItem[]> {
  const now = Date.now()
  const status: RateLimitItem[] = []

  for (const [key, lastTime] of lastSaveTime.entries()) {
    const [module, variable] = key.split(':', 2)
    const secondsSince = (now - lastTime) / 1000
    const isLimited = secondsSince < RATE_LIMIT_SECONDS

    status.push({
      module: module || 'unknown',
      variable: variable || 'unknown',
      last_save: new Date(lastTime).toISOString(),
      seconds_since: Math.round(secondsSince * 10) / 10,
      is_limited: isLimited
    })
  }

  // Group by module
  const grouped: Record<string, RateLimitItem[]> = {}
  for (const item of status) {
    if (!grouped[item.module]) {
      grouped[item.module] = []
    }
    grouped[item.module].push(item)
  }

  return grouped
}
