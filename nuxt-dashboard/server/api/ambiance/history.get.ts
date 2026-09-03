// server/api/ambiance/history.get.ts
import { getDb } from '../../utils/db'

/**
 * GET /api/ambiance/history?grandeur=temperature&groupe=serre&limit=200&hours=6
 * Returns time-series data for a specific grandeur/groupe pair.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const grandeur = ((query.grandeur as string) || '').trim().toLowerCase()
  const groupe   = ((query.groupe   as string) || '').trim().toLowerCase()
  const limit    = Math.min(parseInt((query.limit as string) || '200', 10), 1000)
  const hours    = parseInt((query.hours as string) || '6', 10)

  if (!grandeur) {
    throw createError({ statusCode: 400, message: 'Paramètre "grandeur" requis.' })
  }

  const db = await getDb()

  // Topic patterns for both topic orderings (legacy + current)
  // Current:  bzh/mecatro/ambiance/<groupe>/<grandeur>
  // Legacy:   bzh/mecatro/ambiance/<grandeur>/<groupe>
  const topicPattern1 = groupe
    ? `bzh/mecatro/ambiance/${groupe}/${grandeur}`
    : `bzh/mecatro/ambiance/%/${grandeur}`
  const topicPattern2 = groupe
    ? `bzh/mecatro/ambiance/${grandeur}/${groupe}`
    : `bzh/mecatro/ambiance/${grandeur}/%`

  let rows: Array<{ timestamp: string; payload: string; topic: string }> = []

  try {
    if (db.mode === 'mysql' && db.mysql) {
      const [result]: any = await db.mysql.query(`
        SELECT topic, payload, timestamp
        FROM mqtt_messages
        WHERE category = 'ambiance'
          AND (topic = ? OR topic = ? OR topic LIKE ? OR topic LIKE ?)
          AND timestamp >= NOW() - INTERVAL ? HOUR
        ORDER BY timestamp ASC
        LIMIT ?
      `, [topicPattern1, topicPattern2,
          `bzh/mecatro/ambiance/%/${grandeur}`,
          `bzh/mecatro/ambiance/${grandeur}/%`,
          hours, limit])
      rows = result
    } else if (db.sqlite) {
      rows = db.sqlite.prepare(`
        SELECT topic, payload, timestamp
        FROM mqtt_messages
        WHERE category = 'ambiance'
          AND (topic = ? OR topic = ? OR topic LIKE ? OR topic LIKE ?)
          AND timestamp >= datetime('now', '-' || ? || ' hours')
        ORDER BY timestamp ASC
        LIMIT ?
      `).all(
        topicPattern1, topicPattern2,
        `bzh/mecatro/ambiance/%/${grandeur}`,
        `bzh/mecatro/ambiance/${grandeur}/%`,
        hours, limit
      ) as any[]
    }
  } catch (err: any) {
    console.error('[Ambiance History API]', err.message)
  }

  // Parse and group by groupe
  const series: Record<string, Array<{ t: string; v: number | null }>> = {}

  for (const row of rows) {
    const parts = (row.topic || '').split('/')
    if (parts.length !== 5) continue

    // Detect topic order
    let detectedGroupe: string
    if (parts[4] === grandeur) {
      detectedGroupe = parts[3]
    } else if (parts[3] === grandeur) {
      detectedGroupe = parts[4]
    } else {
      continue
    }

    // Filter by requested groupe if specified
    if (groupe && detectedGroupe !== groupe) continue

    if (!series[detectedGroupe]) series[detectedGroupe] = []

    try {
      const parsed = JSON.parse(row.payload)
      const val = parsed.valeur
      series[detectedGroupe].push({
        t: row.timestamp,
        v: (val !== null && val !== undefined) ? Number(val) : null
      })
    } catch {
      // skip invalid payloads
    }
  }

  return {
    grandeur,
    groupe: groupe || null,
    hours,
    series,
    timestamp: new Date().toISOString()
  }
})
