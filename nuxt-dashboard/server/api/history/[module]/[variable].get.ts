// server/api/history/[module]/[variable].get.ts
import { getHistory } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const module = getRouterParam(event, 'module')
  const variable = getRouterParam(event, 'variable')
  const query = getQuery(event)
  const limit = Math.min(parseInt((query.limit as string) || '100', 10), 1000)

  if (!module || !variable) {
    throw createError({ statusCode: 400, message: 'Module et variable requis' })
  }

  const data = await getHistory(module, variable, limit)
  return data
})
