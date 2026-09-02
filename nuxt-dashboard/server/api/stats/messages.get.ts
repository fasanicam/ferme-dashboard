// server/api/stats/messages.get.ts
import { getMessageStats } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = Math.min(parseInt((query.limit as string) || '60', 10), 1440)
  const stats = await getMessageStats(limit)
  return stats
})
