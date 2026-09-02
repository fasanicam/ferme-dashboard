// server/api/mqtt/projects.get.ts
import { getMqttAnalysisProjects } from '../../utils/db'

export default defineEventHandler(async () => {
  return await getMqttAnalysisProjects()
})
