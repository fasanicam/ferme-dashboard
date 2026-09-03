// server/api/test/publish.post.ts
import { publishMqtt, publishMqttRetain } from '../../plugins/mqtt'
import { validateJsonPayload } from '../../utils/compliance'
import { GRANDEURS_NORMALISEES } from '../../utils/types'

/**
 * POST /api/test/publish
 *
 * Mode dashboard (payload JSON normalisé) :
 *   { mode: 'dashboard', project, variable, valeur, unite, type, dateheure? }
 *   → topic: bzh/mecatro/dashboard/<project>/<variable>
 *
 * Mode ambiance (payload JSON normalisé, retain=true) :
 *   { mode: 'ambiance', grandeur, groupe, valeur, unite, type, dateheure? }
 *   → topic: bzh/mecatro/ambiance/<groupe>/<grandeur>
 *
 * Mode custom (topic + payload libre — pour usage avancé) :
 *   { customTopic, value }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  // Si customTopic est fourni, on force le mode custom (évite le fallback dashboard)
  const mode = body.customTopic ? 'custom' : (body.mode || 'dashboard').trim()

  // Shared JSON payload builder and validator
  function buildJsonPayload(valeur: any, unite: string, type: string, dateheure?: string): { payload: string; error: string | null } {
    const dt = dateheure || new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
    const payload = JSON.stringify({ valeur, unite, type, dateheure: dt })
    const error = validateJsonPayload(payload)
    return { payload, error }
  }

  // ----- MODE DASHBOARD -----
  if (mode === 'dashboard') {
    const project = (body.project || '').trim().toLowerCase()
    const variable = (body.variable || '').trim().toLowerCase()
    const valeur = body.valeur
    const unite = (body.unite || '').trim()
    const type = (body.type || 'float').trim()
    const dateheure = body.dateheure

    if (!project || !variable) {
      throw createError({ statusCode: 400, message: 'Projet et variable sont requis.' })
    }

    if (valeur === undefined || valeur === null) {
      throw createError({ statusCode: 400, message: 'Le champ "valeur" est requis.' })
    }

    const { payload, error } = buildJsonPayload(valeur, unite, type, dateheure)
    if (error) {
      throw createError({ statusCode: 400, message: `Payload invalide : ${error}` })
    }

    const topic = `bzh/mecatro/dashboard/${project}/${variable}`
    try {
      await publishMqtt(topic, payload)
      return { success: true, topic, payload, timestamp: new Date().toISOString() }
    } catch (err: any) {
      throw createError({ statusCode: 500, message: `Erreur MQTT : ${err.message}` })
    }
  }

  // ----- MODE AMBIANCE -----
  if (mode === 'ambiance') {
    const grandeur = (body.grandeur || '').trim().toLowerCase()
    const groupe = (body.groupe || '').trim().toLowerCase()
    const valeur = body.valeur
    const unite = (body.unite || '').trim()
    const type = (body.type || 'float').trim()
    const dateheure = body.dateheure

    if (!grandeur || !groupe) {
      throw createError({ statusCode: 400, message: 'Grandeur et groupe sont requis.' })
    }

    if (!(grandeur in GRANDEURS_NORMALISEES)) {
      throw createError({
        statusCode: 400,
        message: `Grandeur "${grandeur}" inconnue. Grandeurs autorisées : ${Object.keys(GRANDEURS_NORMALISEES).join(', ')}`
      })
    }

    if (valeur === undefined || valeur === null) {
      throw createError({ statusCode: 400, message: 'Le champ "valeur" est requis.' })
    }

    const { payload, error } = buildJsonPayload(valeur, unite, type, dateheure)
    if (error) {
      throw createError({ statusCode: 400, message: `Payload invalide : ${error}` })
    }

    const topic = `bzh/mecatro/ambiance/${groupe}/${grandeur}`
    try {
      // Ambiance requires retain=true
      await publishMqttRetain(topic, payload)
      return { success: true, topic, payload, timestamp: new Date().toISOString() }
    } catch (err: any) {
      throw createError({ statusCode: 500, message: `Erreur MQTT : ${err.message}` })
    }
  }

  // ----- MODE CUSTOM (topic + payload libre) -----
  const customTopic = (body.customTopic || '').trim()
  const value = body.value !== undefined ? String(body.value) : ''

  if (!customTopic) {
    throw createError({ statusCode: 400, message: 'Mode inconnu. Utilisez mode="dashboard", "ambiance" ou fournissez un customTopic.' })
  }

  try {
    await publishMqtt(customTopic, value)
    return { success: true, topic: customTopic, payload: value, timestamp: new Date().toISOString() }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: `Erreur MQTT : ${err.message}` })
  }
})
