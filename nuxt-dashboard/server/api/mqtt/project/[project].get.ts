// server/api/mqtt/project/[project].get.ts
import { getMqttProjectDetails } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const project = getRouterParam(event, 'project')

  if (!project) {
    throw createError({ statusCode: 400, message: 'Nom du projet requis' })
  }

  return await getMqttProjectDetails(project)
})
