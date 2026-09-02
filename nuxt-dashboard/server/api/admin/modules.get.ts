// server/api/admin/modules.get.ts
import { getAllModulesWithVariables } from '../../utils/db'

export default defineEventHandler(async () => {
  return await getAllModulesWithVariables()
})
