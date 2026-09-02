// server/api/stats/publications.get.ts
import { getModulePublicationTrends } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const hours = Math.min(parseInt((query.hours as string) || '12', 10), 72)
  const stats = await getModulePublicationTrends(hours)
  return stats
})
