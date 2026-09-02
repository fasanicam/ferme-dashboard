// server/api/stats/rate-limit.get.ts
import { getRateLimitStatus } from '../../utils/state'

export default defineEventHandler(() => {
  return getRateLimitStatus()
})
