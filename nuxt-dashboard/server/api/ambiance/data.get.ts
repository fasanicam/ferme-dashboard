// server/api/ambiance/data.get.ts
import { ambianceData } from '../../utils/state'
import { GRANDEURS_NORMALISEES } from '../../utils/types'

/**
 * GET /api/ambiance/data
 * Returns all current ambiance data (in-memory) plus metadata on expected grandeurs.
 */
export default defineEventHandler(async () => {
  return {
    data: ambianceData,
    grandeurs_normalisees: GRANDEURS_NORMALISEES,
    timestamp: new Date().toISOString()
  }
})
