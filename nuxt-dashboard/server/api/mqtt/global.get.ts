// server/api/mqtt/global.get.ts
import { getMqttAnalysisGlobal } from '../../utils/db'

export default defineEventHandler(async () => {
  return await getMqttAnalysisGlobal()
})
