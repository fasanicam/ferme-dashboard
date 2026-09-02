// server/api/admin/delete-variable.post.ts
import { deleteVariablePermanently } from '../../utils/db'
import { dashboardData, broadcastSse } from '../../utils/state'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const module = (body.module || '').trim()
  const variable = (body.variable || '').trim()

  if (!module || !variable) {
    throw createError({ statusCode: 400, message: 'Module et variable requis' })
  }

  // Delete from in-memory cache
  if (dashboardData[module] && dashboardData[module][variable]) {
    delete dashboardData[module][variable]
    if (Object.keys(dashboardData[module]).length === 0) {
      delete dashboardData[module]
    }
  }

  // Broadcast deletion to all clients
  broadcastSse('delete_data', { module, variable })

  // Delete permanently from database
  const deletedCount = await deleteVariablePermanently(module, variable)

  return {
    success: true,
    deleted: deletedCount,
    module,
    variable
  }
})
