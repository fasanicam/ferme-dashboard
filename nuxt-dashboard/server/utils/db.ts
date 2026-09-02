// server/utils/db.ts
import mysql from 'mysql2/promise'
import path from 'path'
import fs from 'fs'
import type { GlobalMqttStats, ProjectAnalysis, ProjectDetails } from './types'

let sqliteDb: any = null
let mysqlPool: mysql.Pool | null = null
let dbMode: 'mysql' | 'sqlite' = 'sqlite'

export async function getDb() {
  if (mysqlPool || sqliteDb) {
    return { mode: dbMode, mysql: mysqlPool, sqlite: sqliteDb }
  }

  const config = useRuntimeConfig()
  const dbHost = process.env.NUXT_DB_HOST || process.env.DB_HOST || config.dbHost || '127.0.0.1'
  const dbUser = process.env.NUXT_DB_USER || process.env.DB_USER || config.dbUser || 'prof_bzh'
  const dbPassword = process.env.NUXT_DB_PASSWORD || process.env.DB_PASSWORD || config.dbPassword || 'prof_bzh@root'
  const dbName = process.env.NUXT_DB_NAME || process.env.DB_NAME || config.dbName || 'icambzh'

  // 1. Try MySQL/MariaDB if configured
  if (dbHost && dbUser && dbHost !== '127.0.0.1') {
    try {
      const testPool = mysql.createPool({
        host: dbHost,
        user: dbUser,
        password: dbPassword,
        database: dbName,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        connectTimeout: 3000,
      })

      // Test ping
      const conn = await testPool.getConnection()
      conn.release()

      mysqlPool = testPool
      dbMode = 'mysql'
      console.log(`[DB] ✅ Connecté avec succès à MariaDB/MySQL (${config.dbHost}:${config.dbName})`)
      await initTables()
      return { mode: dbMode, mysql: mysqlPool, sqlite: null }
    } catch (err: any) {
      console.warn(`[DB] ⚠️ Impossible de se connecter à MariaDB (${err.message}). Tentative de bascule sur SQLite.`)
    }
  }

  // 2. Fallback to SQLite (better-sqlite3)
  try {
    const { default: Database } = await import('better-sqlite3')
    const sqliteFile = path.resolve(process.cwd(), config.sqlitePath || '../ferme.db')
    const dir = path.dirname(sqliteFile)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    sqliteDb = new Database(sqliteFile)
    sqliteDb.pragma('journal_mode = WAL')
    dbMode = 'sqlite'
    console.log(`[DB] 🗄️ Base de données SQLite active: ${sqliteFile}`)

    await initTables()
    return { mode: dbMode, mysql: null, sqlite: sqliteDb }
  } catch (err: any) {
    console.error('[DB] ❌ Erreur initialisation SQLite:', err.message)
    return { mode: dbMode, mysql: null, sqlite: null }
  }
}

async function initTables() {
  if (dbMode === 'mysql' && mysqlPool) {
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS measurements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        module VARCHAR(255),
        variable VARCHAR(255),
        value TEXT,
        timestamp DATETIME,
        INDEX idx_meas_mod_var_ts (module, variable, timestamp)
      )
    `)

    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS message_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        timestamp DATETIME,
        INDEX idx_msg_stats_ts (timestamp)
      )
    `)

    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS module_publications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        module VARCHAR(255),
        timestamp DATETIME,
        INDEX idx_mod_pub_ts (timestamp, module)
      )
    `)

    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS mqtt_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        topic VARCHAR(512),
        payload TEXT,
        timestamp DATETIME,
        project VARCHAR(255),
        category VARCHAR(50),
        is_compliant BOOLEAN,
        INDEX idx_timestamp (timestamp),
        INDEX idx_project (project)
      )
    `)
  } else if (sqliteDb) {
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module TEXT,
        variable TEXT,
        value TEXT,
        timestamp TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_meas_mod_var_ts ON measurements(module, variable, timestamp);

      CREATE TABLE IF NOT EXISTS message_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_msg_stats_ts ON message_stats(timestamp);

      CREATE TABLE IF NOT EXISTS module_publications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module TEXT,
        timestamp TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_mod_pub_ts ON module_publications(timestamp, module);

      CREATE TABLE IF NOT EXISTS mqtt_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic TEXT,
        payload TEXT,
        timestamp TEXT,
        project TEXT,
        category TEXT,
        is_compliant INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_mqtt_ts ON mqtt_messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_mqtt_proj ON mqtt_messages(project);
    `)
  }
}

// --- Data Logging Functions ---

export async function saveMeasurement(module: string, variable: string, value: string) {
  try {
    const { mode, mysql, sqlite } = await getDb()
    const nowIso = new Date().toISOString()

    if (mode === 'mysql' && mysql) {
      await mysql.query(
        'INSERT INTO measurements (module, variable, value, timestamp) VALUES (?, ?, ?, NOW())',
        [module, variable, value]
      )
    } else if (sqlite) {
      sqlite.prepare(
        'INSERT INTO measurements (module, variable, value, timestamp) VALUES (?, ?, ?, ?)'
      ).run(module, variable, value, nowIso)
    }
  } catch (err: any) {
    console.error('[DB] Erreur saveMeasurement:', err.message)
  }
}

export async function logMessageReceipt() {
  try {
    const { mode, mysql, sqlite } = await getDb()
    const nowIso = new Date().toISOString()

    if (mode === 'mysql' && mysql) {
      await mysql.query('INSERT INTO message_stats (timestamp) VALUES (NOW())')
    } else if (sqlite) {
      sqlite.prepare('INSERT INTO message_stats (timestamp) VALUES (?)').run(nowIso)
    }
  } catch (err: any) {
    console.error('[DB] Erreur logMessageReceipt:', err.message)
  }
}

export async function logMqttMessage(topic: string, payload: string, project: string | null, category: string, isCompliant: boolean) {
  try {
    const { mode, mysql, sqlite } = await getDb()
    const nowIso = new Date().toISOString()

    if (mode === 'mysql' && mysql) {
      await mysql.query(
        'INSERT INTO mqtt_messages (topic, payload, timestamp, project, category, is_compliant) VALUES (?, ?, NOW(), ?, ?, ?)',
        [topic, payload, project, category, isCompliant ? 1 : 0]
      )
    } else if (sqlite) {
      sqlite.prepare(
        'INSERT INTO mqtt_messages (topic, payload, timestamp, project, category, is_compliant) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(topic, payload, nowIso, project, category, isCompliant ? 1 : 0)
    }
  } catch (err: any) {
    console.error('[DB] Erreur logMqttMessage:', err.message)
  }
}

export async function logModulePublication(module: string) {
  try {
    const { mode, mysql, sqlite } = await getDb()
    const nowIso = new Date().toISOString()

    if (mode === 'mysql' && mysql) {
      await mysql.query('INSERT INTO module_publications (module, timestamp) VALUES (?, NOW())', [module])
    } else if (sqlite) {
      sqlite.prepare('INSERT INTO module_publications (module, timestamp) VALUES (?, ?)').run(module, nowIso)
    }
  } catch (err: any) {
    console.error('[DB] Erreur logModulePublication:', err.message)
  }
}

// --- Query Functions ---

export async function getHistory(module: string, variable: string, limit = 100): Promise<Array<[string, string]>> {
  const { mode, mysql, sqlite } = await getDb()

  if (mode === 'mysql' && mysql) {
    const [rows]: any = await mysql.query(
      'SELECT value, timestamp FROM measurements WHERE module=? AND variable=? ORDER BY timestamp DESC LIMIT ?',
      [module, variable, limit]
    )
    const result = rows.map((r: any) => [
      String(r.value),
      r.timestamp instanceof Date ? r.timestamp.toISOString() : String(r.timestamp)
    ])
    return result.reverse()
  } else if (sqlite) {
    const rows = sqlite.prepare(
      'SELECT value, timestamp FROM measurements WHERE module=? AND variable=? ORDER BY timestamp DESC LIMIT ?'
    ).all(module, variable, limit) as Array<{ value: string; timestamp: string }>
    const result = rows.map(r => [String(r.value), String(r.timestamp)] as [string, string])
    return result.reverse()
  }
  return []
}

export async function getMessageStats(limit = 60): Promise<Array<[string, number]>> {
  const { mode, mysql, sqlite } = await getDb()

  if (mode === 'mysql' && mysql) {
    const [rows]: any = await mysql.query(`
      SELECT DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i') as minute, COUNT(*) as count
      FROM message_stats 
      WHERE timestamp >= NOW() - INTERVAL ? MINUTE
      GROUP BY minute 
      ORDER BY minute DESC LIMIT ?
    `, [limit, limit])

    const result = rows.map((r: any) => [String(r.minute), Number(r.count)] as [string, number])
    return result.reverse()
  } else if (sqlite) {
    const rows = sqlite.prepare(`
      SELECT strftime('%Y-%m-%d %H:%M', timestamp) as minute, COUNT(*) as count
      FROM message_stats
      WHERE timestamp >= datetime('now', '-' || ? || ' minutes')
      GROUP BY minute
      ORDER BY minute DESC LIMIT ?
    `).all(limit, limit) as Array<{ minute: string; count: number }>

    const result = rows.map(r => [String(r.minute), Number(r.count)] as [string, number])
    return result.reverse()
  }
  return []
}

export async function getModulePublicationTrends(hours = 12): Promise<Array<[string, string, number]>> {
  const { mode, mysql, sqlite } = await getDb()

  if (mode === 'mysql' && mysql) {
    const [rows]: any = await mysql.query(`
      SELECT module, DATE_FORMAT(timestamp, '%Y-%m-%d %H:00') as hour, COUNT(*) as count
      FROM module_publications 
      WHERE timestamp >= NOW() - INTERVAL ? HOUR
      GROUP BY module, hour 
      ORDER BY hour ASC
    `, [hours])

    return rows.map((r: any) => [String(r.module), String(r.hour), Number(r.count)] as [string, string, number])
  } else if (sqlite) {
    const rows = sqlite.prepare(`
      SELECT module, strftime('%Y-%m-%d %H:00', timestamp) as hour, COUNT(*) as count
      FROM module_publications
      WHERE timestamp >= datetime('now', '-' || ? || ' hours')
      GROUP BY module, hour
      ORDER BY hour ASC
    `).all(hours) as Array<{ module: string; hour: string; count: number }>

    return rows.map(r => [String(r.module), String(r.hour), Number(r.count)] as [string, string, number])
  }
  return []
}

export async function getMqttAnalysisGlobal(): Promise<GlobalMqttStats> {
  const { mode, mysql, sqlite } = await getDb()

  if (mode === 'mysql' && mysql) {
    const [totalRows]: any = await mysql.query('SELECT COUNT(*) as total FROM mqtt_messages')
    const total = totalRows[0]?.total || 0

    const [compliantRows]: any = await mysql.query('SELECT COUNT(*) as compliant FROM mqtt_messages WHERE is_compliant = 1')
    const compliant = compliantRows[0]?.compliant || 0

    const [activeRows]: any = await mysql.query(`
      SELECT COUNT(DISTINCT project) as active 
      FROM mqtt_messages 
      WHERE timestamp >= NOW() - INTERVAL 24 HOUR AND project IS NOT NULL AND project != ''
    `)
    const active = activeRows[0]?.active || 0

    const [catRows]: any = await mysql.query(`
      SELECT category, COUNT(*) as count 
      FROM mqtt_messages 
      GROUP BY category
      ORDER BY count DESC
    `)
    const categories: Record<string, number> = {}
    for (const r of catRows) {
      categories[r.category || 'other'] = Number(r.count)
    }

    const [unkRows]: any = await mysql.query("SELECT COUNT(*) as unknown_traffic FROM mqtt_messages WHERE project IS NULL OR project = ''")
    const unknownTraffic = unkRows[0]?.unknown_traffic || 0

    return {
      total_messages: total,
      compliant_messages: compliant,
      non_compliant_messages: total - compliant,
      compliance_rate: total > 0 ? Number(((compliant / total) * 100).toFixed(1)) : 100,
      active_projects: active,
      categories,
      unknown_traffic: unknownTraffic
    }
  } else if (sqlite) {
    const total = (sqlite.prepare('SELECT COUNT(*) as c FROM mqtt_messages').get() as any)?.c || 0
    const compliant = (sqlite.prepare('SELECT COUNT(*) as c FROM mqtt_messages WHERE is_compliant = 1').get() as any)?.c || 0
    const active = (sqlite.prepare(`
      SELECT COUNT(DISTINCT project) as c 
      FROM mqtt_messages 
      WHERE timestamp >= datetime('now', '-24 hours') AND project IS NOT NULL AND project != ''
    `).get() as any)?.c || 0

    const catRows = sqlite.prepare(`
      SELECT category, COUNT(*) as count 
      FROM mqtt_messages 
      GROUP BY category
      ORDER BY count DESC
    `).all() as Array<{ category: string; count: number }>

    const categories: Record<string, number> = {}
    for (const r of catRows) {
      categories[r.category || 'other'] = Number(r.count)
    }

    const unknownTraffic = (sqlite.prepare("SELECT COUNT(*) as c FROM mqtt_messages WHERE project IS NULL OR project = ''").get() as any)?.c || 0

    return {
      total_messages: total,
      compliant_messages: compliant,
      non_compliant_messages: total - compliant,
      compliance_rate: total > 0 ? Number(((compliant / total) * 100).toFixed(1)) : 100,
      active_projects: active,
      categories,
      unknown_traffic: unknownTraffic
    }
  }

  return {
    total_messages: 0,
    compliant_messages: 0,
    non_compliant_messages: 0,
    compliance_rate: 100,
    active_projects: 0,
    categories: {},
    unknown_traffic: 0
  }
}

export async function getMqttAnalysisProjects(): Promise<ProjectAnalysis[]> {
  const { mode, mysql, sqlite } = await getDb()

  let rows: Array<{
    project: string
    total_msgs: number
    compliant_msgs: number
    last_seen: any
  }> = []

  if (mode === 'mysql' && mysql) {
    const [dbRows]: any = await mysql.query(`
      SELECT 
        project,
        COUNT(*) as total_msgs,
        SUM(CASE WHEN is_compliant = 1 THEN 1 ELSE 0 END) as compliant_msgs,
        MAX(timestamp) as last_seen
      FROM mqtt_messages 
      WHERE project IS NOT NULL AND project != ''
      GROUP BY project
      ORDER BY total_msgs DESC
    `)
    rows = dbRows
  } else if (sqlite) {
    rows = sqlite.prepare(`
      SELECT 
        project,
        COUNT(*) as total_msgs,
        SUM(CASE WHEN is_compliant = 1 THEN 1 ELSE 0 END) as compliant_msgs,
        MAX(timestamp) as last_seen
      FROM mqtt_messages 
      WHERE project IS NOT NULL AND project != ''
      GROUP BY project
      ORDER BY total_msgs DESC
    `).all() as any
  }

  return rows.map(p => {
    const total = Number(p.total_msgs) || 0
    const compliant = Number(p.compliant_msgs) || 0
    const complianceRatio = total > 0 ? compliant / total : 0
    const score = Math.round(complianceRatio * 100)
    const volume = total > 10000 ? 'High' : 'Normal'
    const lastSeenStr = p.last_seen instanceof Date ? p.last_seen.toISOString() : (p.last_seen ? String(p.last_seen) : 'N/A')

    return {
      name: p.project,
      total,
      compliant,
      compliance_rate: Number((complianceRatio * 100).toFixed(1)),
      last_seen: lastSeenStr,
      score,
      volume
    }
  })
}

export async function getMqttProjectDetails(projectName: string): Promise<ProjectDetails> {
  const { mode, mysql, sqlite } = await getDb()

  if (mode === 'mysql' && mysql) {
    const [errors]: any = await mysql.query(`
      SELECT topic, COUNT(*) as count
      FROM mqtt_messages
      WHERE project = ? AND is_compliant = 0
      GROUP BY topic
      ORDER BY count DESC
      LIMIT 10
    `, [projectName])

    const [frequency]: any = await mysql.query(`
      SELECT 
        DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i') as minute,
        COUNT(*) as count
      FROM mqtt_messages
      WHERE project = ? AND timestamp >= NOW() - INTERVAL 1 HOUR
      GROUP BY minute
      ORDER BY minute DESC
    `, [projectName])

    const maxFreq = Math.max(...frequency.map((f: any) => Number(f.count)), 0)
    const avgFreq = frequency.length > 0 ? frequency.reduce((acc: number, cur: any) => acc + Number(cur.count), 0) / frequency.length : 0

    const [categories]: any = await mysql.query(`
      SELECT category, COUNT(*) as count
      FROM mqtt_messages
      WHERE project = ?
      GROUP BY category
    `, [projectName])

    const [topTopics]: any = await mysql.query(`
      SELECT topic, COUNT(*) as count, MAX(timestamp) as last_seen
      FROM mqtt_messages
      WHERE project = ?
      GROUP BY topic
      ORDER BY count DESC
      LIMIT 10
    `, [projectName])

    const [timeline]: any = await mysql.query(`
      SELECT 
        DATE_FORMAT(timestamp, '%Y-%m-%d %H:00') as hour,
        COUNT(*) as count
      FROM mqtt_messages
      WHERE project = ? AND timestamp >= NOW() - INTERVAL 24 HOUR
      GROUP BY hour
      ORDER BY hour ASC
    `, [projectName])

    const [statsRows]: any = await mysql.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_compliant = 1 THEN 1 ELSE 0 END) as compliant,
        MIN(timestamp) as first_seen,
        MAX(timestamp) as last_seen
      FROM mqtt_messages
      WHERE project = ?
    `, [projectName])
    const stats = statsRows[0] || null

    const [recentMessages]: any = await mysql.query(`
      SELECT topic, payload, timestamp, is_compliant
      FROM mqtt_messages
      WHERE project = ?
      ORDER BY timestamp DESC
      LIMIT 15
    `, [projectName])

    return {
      project: projectName,
      stats: stats ? {
        total: Number(stats.total) || 0,
        compliant: Number(stats.compliant) || 0,
        first_seen: stats.first_seen instanceof Date ? stats.first_seen.toISOString() : (stats.first_seen ? String(stats.first_seen) : null),
        last_seen: stats.last_seen instanceof Date ? stats.last_seen.toISOString() : (stats.last_seen ? String(stats.last_seen) : null)
      } : null,
      errors: errors.map((e: any) => ({ topic: String(e.topic), count: Number(e.count) })),
      frequency: {
        data: frequency.map((f: any) => ({ minute: String(f.minute), count: Number(f.count) })),
        max: maxFreq,
        avg: Number(avgFreq.toFixed(1))
      },
      categories: categories.map((c: any) => ({ category: String(c.category), count: Number(c.count) })),
      top_topics: topTopics.map((t: any) => ({
        topic: String(t.topic),
        count: Number(t.count),
        last_seen: t.last_seen instanceof Date ? t.last_seen.toISOString() : (t.last_seen ? String(t.last_seen) : null)
      })),
      timeline: timeline.map((tl: any) => ({ hour: String(tl.hour), count: Number(tl.count) })),
      recent_messages: recentMessages.map((m: any) => ({
        topic: String(m.topic),
        payload: String(m.payload),
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
        is_compliant: Boolean(m.is_compliant)
      }))
    }
  } else if (sqlite) {
    const errors = sqlite.prepare(`
      SELECT topic, COUNT(*) as count
      FROM mqtt_messages
      WHERE project = ? AND is_compliant = 0
      GROUP BY topic
      ORDER BY count DESC
      LIMIT 10
    `).all(projectName) as any[]

    const frequency = sqlite.prepare(`
      SELECT 
        strftime('%Y-%m-%d %H:%M', timestamp) as minute,
        COUNT(*) as count
      FROM mqtt_messages
      WHERE project = ? AND timestamp >= datetime('now', '-1 hour')
      GROUP BY minute
      ORDER BY minute DESC
    `).all(projectName) as any[]

    const maxFreq = Math.max(...frequency.map(f => Number(f.count)), 0)
    const avgFreq = frequency.length > 0 ? frequency.reduce((acc, cur) => acc + Number(cur.count), 0) / frequency.length : 0

    const categories = sqlite.prepare(`
      SELECT category, COUNT(*) as count
      FROM mqtt_messages
      WHERE project = ?
      GROUP BY category
    `).all(projectName) as any[]

    const topTopics = sqlite.prepare(`
      SELECT topic, COUNT(*) as count, MAX(timestamp) as last_seen
      FROM mqtt_messages
      WHERE project = ?
      GROUP BY topic
      ORDER BY count DESC
      LIMIT 10
    `).all(projectName) as any[]

    const timeline = sqlite.prepare(`
      SELECT 
        strftime('%Y-%m-%d %H:00', timestamp) as hour,
        COUNT(*) as count
      FROM mqtt_messages
      WHERE project = ? AND timestamp >= datetime('now', '-24 hours')
      GROUP BY hour
      ORDER BY hour ASC
    `).all(projectName) as any[]

    const stats = sqlite.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_compliant = 1 THEN 1 ELSE 0 END) as compliant,
        MIN(timestamp) as first_seen,
        MAX(timestamp) as last_seen
      FROM mqtt_messages
      WHERE project = ?
    `).get(projectName) as any

    const recentMessages = sqlite.prepare(`
      SELECT topic, payload, timestamp, is_compliant
      FROM mqtt_messages
      WHERE project = ?
      ORDER BY timestamp DESC
      LIMIT 15
    `).all(projectName) as any[]

    return {
      project: projectName,
      stats: stats ? {
        total: Number(stats.total) || 0,
        compliant: Number(stats.compliant) || 0,
        first_seen: stats.first_seen ? String(stats.first_seen) : null,
        last_seen: stats.last_seen ? String(stats.last_seen) : null
      } : null,
      errors: errors.map(e => ({ topic: String(e.topic), count: Number(e.count) })),
      frequency: {
        data: frequency.map(f => ({ minute: String(f.minute), count: Number(f.count) })),
        max: maxFreq,
        avg: Number(avgFreq.toFixed(1))
      },
      categories: categories.map(c => ({ category: String(c.category), count: Number(c.count) })),
      top_topics: topTopics.map(t => ({ topic: String(t.topic), count: Number(t.count), last_seen: t.last_seen ? String(t.last_seen) : null })),
      timeline: timeline.map(tl => ({ hour: String(tl.hour), count: Number(tl.count) })),
      recent_messages: recentMessages.map(m => ({
        topic: String(m.topic),
        payload: String(m.payload),
        timestamp: String(m.timestamp),
        is_compliant: Boolean(m.is_compliant)
      }))
    }
  }

  return {
    project: projectName,
    stats: null,
    errors: [],
    frequency: { data: [], max: 0, avg: 0 },
    categories: [],
    top_topics: [],
    timeline: [],
    recent_messages: []
  }
}

export async function getAllModulesWithVariables(): Promise<Record<string, string[]>> {
  const { mode, mysql, sqlite } = await getDb()
  let rows: Array<{ module: string; variable: string }> = []

  if (mode === 'mysql' && mysql) {
    const [dbRows]: any = await mysql.query(`
      SELECT DISTINCT module, variable 
      FROM measurements 
      ORDER BY module, variable
    `)
    rows = dbRows
  } else if (sqlite) {
    rows = sqlite.prepare(`
      SELECT DISTINCT module, variable 
      FROM measurements 
      ORDER BY module, variable
    `).all() as any
  }

  const modules: Record<string, string[]> = {}
  for (const r of rows) {
    if (!modules[r.module]) {
      modules[r.module] = []
    }
    modules[r.module].push(r.variable)
  }
  return modules
}

export async function deleteVariablePermanently(module: string, variable: string): Promise<number> {
  const { mode, mysql, sqlite } = await getDb()

  if (mode === 'mysql' && mysql) {
    const [result]: any = await mysql.query(
      'DELETE FROM measurements WHERE module=? AND variable=?',
      [module, variable]
    )
    return result.affectedRows || 0
  } else if (sqlite) {
    const info = sqlite.prepare(
      'DELETE FROM measurements WHERE module=? AND variable=?'
    ).run(module, variable)
    return info.changes
  }
  return 0
}

export async function deleteModulePermanently(module: string): Promise<{ measurements: number; publications: number }> {
  const { mode, mysql, sqlite } = await getDb()

  if (mode === 'mysql' && mysql) {
    const [measResult]: any = await mysql.query('DELETE FROM measurements WHERE module=?', [module])
    const [pubResult]: any = await mysql.query('DELETE FROM module_publications WHERE module=?', [module])
    return {
      measurements: measResult.affectedRows || 0,
      publications: pubResult.affectedRows || 0
    }
  } else if (sqlite) {
    const measInfo = sqlite.prepare('DELETE FROM measurements WHERE module=?').run(module)
    const pubInfo = sqlite.prepare('DELETE FROM module_publications WHERE module=?').run(module)
    return {
      measurements: measInfo.changes,
      publications: pubInfo.changes
    }
  }
  return { measurements: 0, publications: 0 }
}

export async function cleanupOldMqttMessages(): Promise<void> {
  try {
    const { mode, mysql, sqlite } = await getDb()
    if (mode === 'mysql' && mysql) {
      const [countRows]: any = await mysql.query('SELECT COUNT(*) as total FROM mqtt_messages')
      const total = countRows[0]?.total || 0
      if (total > 1000000) {
        const toDelete = total - 1000000
        await mysql.query(`
          DELETE FROM mqtt_messages 
          WHERE id IN (
            SELECT id FROM (
              SELECT id FROM mqtt_messages 
              ORDER BY timestamp ASC 
              LIMIT ?
            ) tmp
          )
        `, [toDelete])
        console.log(`[DB Cleanup] 🧹 ${toDelete} anciens messages purgés. (1M conservés)`)
      }
    } else if (sqlite) {
      const total = (sqlite.prepare('SELECT COUNT(*) as c FROM mqtt_messages').get() as any)?.c || 0
      if (total > 1000000) {
        const toDelete = total - 1000000
        sqlite.prepare(`
          DELETE FROM mqtt_messages 
          WHERE id IN (
            SELECT id FROM (
              SELECT id FROM mqtt_messages 
              ORDER BY timestamp ASC 
              LIMIT ?
            )
          )
        `).run(toDelete)
        console.log(`[DB Cleanup] 🧹 ${toDelete} anciens messages purgés. (1M conservés)`)
      }
    }
  } catch (err: any) {
    console.error('[DB Cleanup Error]:', err.message)
  }
}
