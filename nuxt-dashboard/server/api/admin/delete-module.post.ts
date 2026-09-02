// server/api/admin/delete-module.post.ts
import { deleteModulePermanently } from '../../utils/db'
import { dashboardData, broadcastSse } from '../../utils/state'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const module = (body.module || '').trim()

  if (!module) {
    throw createError({ statusCode: 400, message: 'Nom du module requis' })
  }

  // Delete from in-memory cache
  if (dashboardData[module]) {
    delete dashboardData[module]
  }

  // Broadcast deletion of all variables in this module
  broadcastSse('delete_data', { module, variable: '*' })

  // Delete permanently from database
  const result = await deleteModulePermanently(module)

  return {
    success: true,
    deleted: result,
    module
  }
})
