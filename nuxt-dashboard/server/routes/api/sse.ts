// server/routes/api/sse.ts
import { registerSseClient, unregisterSseClient, type SseClient } from '../../utils/state'

export default defineEventHandler((event) => {
  const eventStream = createEventStream(event)
  const clientId = `client_${Math.random().toString(36).slice(2, 9)}`

  const client: SseClient = {
    id: clientId,
    send: (eventName: string, data: any) => {
      eventStream.push({
        event: eventName,
        data: JSON.stringify(data)
      })
    },
    close: () => {
      eventStream.close()
    }
  }

  registerSseClient(client)

  // Send initial handshake
  eventStream.push({
    event: 'connected',
    data: JSON.stringify({ id: clientId, time: new Date().toISOString() })
  })

  // Keep-alive heartbeat every 20 seconds
  const interval = setInterval(() => {
    eventStream.push({
      event: 'ping',
      data: JSON.stringify({ timestamp: Date.now() })
    })
  }, 20000)

  eventStream.onClosed(() => {
    clearInterval(interval)
    unregisterSseClient(clientId)
  })

  return eventStream.send()
})
