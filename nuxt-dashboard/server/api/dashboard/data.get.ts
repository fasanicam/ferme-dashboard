// server/api/dashboard/data.get.ts
import { dashboardData } from '../../utils/state'

export default defineEventHandler(() => {
  return {
    dashboard: dashboardData,
    timestamp: new Date().toISOString()
  }
})
