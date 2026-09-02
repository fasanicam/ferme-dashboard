// server/utils/compliance.ts
import type { ComplianceResult } from './types'
import { GRANDEURS_NORMALISEES } from './types'

/**
 * Validate a payload that must be a JSON object with the 4 required fields:
 *   { valeur, unite, type, dateheure }
 *
 * Used for BOTH dashboard and ambiance topics.
 * Returns null if valid, or an error string describing the problem.
 */
export function validateJsonPayload(payload: string): string | null {
  let parsed: any
  try {
    parsed = JSON.parse(payload)
  } catch {
    return 'Payload non-JSON : doit être un objet JSON avec 4 champs (ex: {"valeur":21.4,"unite":"°C","type":"float","dateheure":"2026-01-01T12:00:00Z"})'
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return 'Le payload doit être un objet JSON (pas un tableau ou une valeur primitive)'
  }

  // Check required fields
  const required = ['valeur', 'unite', 'type', 'dateheure']
  for (const field of required) {
    if (!(field in parsed)) {
      return `Champ obligatoire manquant : "${field}"`
    }
  }

  // Validate 'type' field value
  const validTypes = ['float', 'int', 'bool', 'string']
  if (!validTypes.includes(parsed.type)) {
    return `Champ "type" invalide : "${parsed.type}" — valeurs acceptées : ${validTypes.join(', ')}`
  }

  // Validate 'unite' is a non-empty string
  if (typeof parsed.unite !== 'string' || parsed.unite.trim() === '') {
    return 'Champ "unite" invalide : doit être une chaîne non vide (ex: "°C", "%", "hPa")'
  }

  // Validate 'dateheure' is ISO 8601 UTC
  if (typeof parsed.dateheure !== 'string') {
    return 'Champ "dateheure" invalide : doit être une chaîne ISO 8601 UTC (ex: "2026-01-01T12:00:00Z")'
  }
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/
  if (!iso8601Regex.test(parsed.dateheure)) {
    return `Champ "dateheure" mal formaté : "${parsed.dateheure}" — attendu ISO 8601 UTC (ex: "2026-01-01T12:00:00Z")`
  }

  // Validate 'valeur' type matches declared 'type'
  if (parsed.type === 'float' || parsed.type === 'int') {
    if (typeof parsed.valeur !== 'number') {
      return `Champ "valeur" invalide : type déclaré "${parsed.type}" mais valeur non numérique ("${parsed.valeur}")`
    }
  } else if (parsed.type === 'bool') {
    if (typeof parsed.valeur !== 'boolean') {
      return `Champ "valeur" invalide : type déclaré "bool" mais valeur non booléenne ("${parsed.valeur}")`
    }
  } else if (parsed.type === 'string') {
    if (typeof parsed.valeur !== 'string') {
      return `Champ "valeur" invalide : type déclaré "string" mais valeur non-string`
    }
  }

  return null
}

// Keep alias for backward compat
export const validateAmbiancePayload = validateJsonPayload

/**
 * Format a parsed JSON payload into a human-readable display string.
 * Examples: "21.4 °C", "67 %", "ouverte", "true"
 */
export function formatPayloadDisplay(parsed: { valeur: any; unite: string; type: string }): string {
  const { valeur, unite, type } = parsed
  if (type === 'float' || type === 'int') {
    return `${valeur} ${unite}`
  }
  // For bool/string, don't append unit (avoids "ouverte enumeration")
  return String(valeur)
}

/**
 * Evaluate the compliance of an MQTT topic and its payload.
 * Pass payload as undefined for topic-only checks.
 *
 * JSON payload validation applies to BOTH dashboard and ambiance topics.
 */
export function evaluateMqttCompliance(topic: string, payload?: string): ComplianceResult {
  const parts = topic.split('/')
  let project: string | null = null
  let category = 'other'
  let isCompliant = false
  let errorReason: string | null = null
  let payloadError: string | null = null

  if (parts.length >= 3 && parts[0] === 'bzh' && parts[1] === 'mecatro') {

    // --- DASHBOARD ---
    if (parts[2] === 'dashboard') {
      category = 'dashboard'
      if (parts.length >= 4) {
        project = parts[3]
      }

      if (parts.length !== 5) {
        isCompliant = false
        if (parts.length > 5) {
          errorReason = `Trop de niveaux (${parts.length} au lieu de 5). Format attendu: bzh/mecatro/dashboard/<PROJET>/<VARIABLE>`
        } else {
          errorReason = `Pas assez de niveaux (${parts.length}). Format attendu: bzh/mecatro/dashboard/<PROJET>/<VARIABLE>`
        }
      } else {
        // Topic structure is valid — validate JSON payload
        if (payload !== undefined) {
          // Empty payload = delete command → valid (special case)
          if (payload === '') {
            isCompliant = true
          } else {
            payloadError = validateJsonPayload(payload)
            isCompliant = payloadError === null
            if (!isCompliant) {
              errorReason = `Payload invalide : ${payloadError}`
            }
          }
        } else {
          // No payload provided for check — topic structure is valid
          isCompliant = true
        }
      }

    // --- AMBIANCE ---
    } else if (parts[2] === 'ambiance') {
      category = 'ambiance'
      if (parts.length >= 4) {
        project = parts[3]
      }

      if (parts.length !== 5) {
        isCompliant = false
        errorReason = `Nombre de niveaux incorrect (${parts.length} au lieu de 5). Format attendu: bzh/mecatro/ambiance/<GROUPE>/<GRANDEUR>`
      } else {
        let groupe = parts[3]
        let grandeur = parts[4]

        // Legacy format fallback: bzh/mecatro/ambiance/<GRANDEUR>/<GROUPE>
        if (!(grandeur in GRANDEURS_NORMALISEES) && (parts[3] in GRANDEURS_NORMALISEES)) {
          grandeur = parts[3]
          groupe = parts[4]
          project = groupe
        }

        if (!(grandeur in GRANDEURS_NORMALISEES)) {
          isCompliant = false
          errorReason = `Grandeur "${grandeur}" inconnue. Format attendu: bzh/mecatro/ambiance/<GROUPE>/<GRANDEUR> avec une grandeur parmi : ${Object.keys(GRANDEURS_NORMALISEES).join(', ')}`
        } else if (payload !== undefined) {
          payloadError = validateJsonPayload(payload)
          isCompliant = payloadError === null
          if (!isCompliant) {
            errorReason = `Payload invalide : ${payloadError}`
          }
        } else {
          isCompliant = true
        }
      }

    // --- PRIVE / PROJETS (private) ---
    } else if (parts[2] === 'prive' || parts[2] === 'projets') {
      if (parts.length >= 4) {
        project = parts[3]
      }

      if (parts.length === 6 && (parts[4] === 'capteurs' || parts[4] === 'actionneurs')) {
        category = parts[4]
        isCompliant = true
      } else if (parts.length >= 5 && (parts[4] === 'capteurs' || parts[4] === 'actionneurs')) {
        category = parts[4]
        isCompliant = false
        errorReason = `Nombre de niveaux incorrect (${parts.length} au lieu de 6). Attendu: bzh/mecatro/prive/<PROJET>/${parts[4]}/<NOM>`
      } else {
        category = 'project_structure_error'
        isCompliant = false
        errorReason = 'Structure invalide pour prive (attendu: .../prive/<PROJET>/capteurs|actionneurs/<NOM>)'
      }

    } else {
      category = parts[2] || 'other'
      isCompliant = false
      errorReason = `Catégorie inconnue '${parts[2]}' sous bzh/mecatro/`
    }
  } else {
    category = 'external'
    isCompliant = false
    errorReason = 'Topic hors de la racine bzh/mecatro/'
  }

  return { project, category, isCompliant, errorReason, payloadError }
}
