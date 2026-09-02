// server/api/ambiance/analysis.get.ts
import { ambianceData } from '../../utils/state'
import { GRANDEURS_NORMALISEES } from '../../utils/types'
import { getDb } from '../../utils/db'

/**
 * GET /api/ambiance/analysis
 * Returns ambiance compliance stats per group and per grandeur, pulling from
 * both in-memory state and the mqtt_messages database table.
 */
export default defineEventHandler(async () => {
  const db = await getDb()

  // Build per-grandeur stats from mqtt_messages table
  const grandeurStats: Record<string, {
    grandeur: string
    unite: string
    type: string
    total: number
    compliant: number
    compliance_rate: number
    groupes: Record<string, {
      groupe: string
      total: number
      compliant: number
      compliance_rate: number
      last_seen: string | null
      last_value: any | null
    }>
  }> = {}

  // Initialize entries for all known grandeurs
  for (const [grandeur, meta] of Object.entries(GRANDEURS_NORMALISEES)) {
    grandeurStats[grandeur] = {
      grandeur,
      unite: meta.unite,
      type: meta.type,
      total: 0,
      compliant: 0,
      compliance_rate: 100,
      groupes: {}
    }
  }

  try {
    // Query DB for ambiance messages (category = 'ambiance')
    let rows: any[] = []

    if (db.mode === 'mysql' && db.mysql) {
      const [result] = await db.mysql.query(`
        SELECT 
          topic,
          payload,
          timestamp,
          project,
          is_compliant
        FROM mqtt_messages
        WHERE category = 'ambiance'
        ORDER BY timestamp DESC
        LIMIT 10000
      `)
      rows = result as any[]
    } else if (db.sqlite) {
      rows = db.sqlite.prepare(`
        SELECT topic, payload, timestamp, project, is_compliant
        FROM mqtt_messages
        WHERE category = 'ambiance'
        ORDER BY timestamp DESC
        LIMIT 10000
      `).all()
    }

    // Aggregate stats per grandeur / groupe
    const latestPerGroup: Record<string, { timestamp: string; payload: string }> = {}

    for (const row of rows) {
      const parts = (row.topic || '').split('/')
      if (parts.length !== 5) continue
      const grandeur = parts[3]
      const groupe = parts[4]
      const key = `${grandeur}:${groupe}`

      if (!grandeurStats[grandeur]) {
        // Unknown grandeur — still track it
        grandeurStats[grandeur] = {
          grandeur,
          unite: '?',
          type: '?',
          total: 0,
          compliant: 0,
          compliance_rate: 0,
          groupes: {}
        }
      }

      if (!grandeurStats[grandeur].groupes[groupe]) {
        grandeurStats[grandeur].groupes[groupe] = {
          groupe,
          total: 0,
          compliant: 0,
          compliance_rate: 100,
          last_seen: null,
          last_value: null
        }
      }

      grandeurStats[grandeur].total++
      grandeurStats[grandeur].groupes[groupe].total++

      const isCompliant = row.is_compliant === true || row.is_compliant === 1
      if (isCompliant) {
        grandeurStats[grandeur].compliant++
        grandeurStats[grandeur].groupes[groupe].compliant++
      }

      // Track latest message per group
      if (!latestPerGroup[key] || row.timestamp > latestPerGroup[key].timestamp) {
        latestPerGroup[key] = { timestamp: row.timestamp, payload: row.payload }
      }
    }

    // Finalize: compute compliance rates + last values
    for (const [grandeur, gStat] of Object.entries(grandeurStats)) {
      gStat.compliance_rate = gStat.total > 0
        ? Math.round((gStat.compliant / gStat.total) * 100)
        : 100

      for (const [groupe, grStat] of Object.entries(gStat.groupes)) {
        grStat.compliance_rate = grStat.total > 0
          ? Math.round((grStat.compliant / grStat.total) * 100)
          : 100

        const key = `${grandeur}:${groupe}`
        const latest = latestPerGroup[key]
        if (latest) {
          grStat.last_seen = latest.timestamp
          try {
            const parsed = JSON.parse(latest.payload)
            grStat.last_value = parsed.valeur ?? null
          } catch {
            grStat.last_value = null
          }
        }
      }
    }

    // Merge in-memory live data (may have groups not yet in DB)
    for (const [grandeur, groupeMap] of Object.entries(ambianceData)) {
      if (!grandeurStats[grandeur]) {
        const meta = GRANDEURS_NORMALISEES[grandeur] || { unite: '?', type: '?' }
        grandeurStats[grandeur] = {
          grandeur, unite: meta.unite, type: meta.type,
          total: 0, compliant: 0, compliance_rate: 100, groupes: {}
        }
      }
      for (const [groupe, entry] of Object.entries(groupeMap)) {
        if (!grandeurStats[grandeur].groupes[groupe]) {
          grandeurStats[grandeur].groupes[groupe] = {
            groupe, total: 0, compliant: 0, compliance_rate: 100,
            last_seen: entry.derniere_maj,
            last_value: entry.valeur
          }
        } else {
          // Update live value if more recent
          grandeurStats[grandeur].groupes[groupe].last_value = entry.valeur
          grandeurStats[grandeur].groupes[groupe].last_seen = entry.derniere_maj
        }
      }
    }

  } catch (err: any) {
    console.error('[Ambiance Analysis API Error]:', err.message)
  }

  // Compute global ambiance compliance
  let totalAll = 0, compliantAll = 0
  for (const g of Object.values(grandeurStats)) {
    totalAll += g.total
    compliantAll += g.compliant
  }

  return {
    global: {
      total: totalAll,
      compliant: compliantAll,
      compliance_rate: totalAll > 0 ? Math.round((compliantAll / totalAll) * 100) : 100,
      active_grandeurs: Object.values(grandeurStats).filter(g => g.total > 0).length,
      active_groupes: Object.values(grandeurStats).reduce((sum, g) => sum + Object.keys(g.groupes).length, 0)
    },
    grandeurs: Object.values(grandeurStats).sort((a, b) => b.total - a.total),
    timestamp: new Date().toISOString()
  }
})
