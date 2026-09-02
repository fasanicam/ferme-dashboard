// server/api/dashboard/messages.get.ts
import { lastMessages } from '../../utils/state'

export default defineEventHandler(() => {
  return {
    messages: lastMessages.slice(0, 30),
    timestamp: new Date().toISOString()
  }
})
