// server/plugins/mqtt.ts
import mqtt from 'mqtt'
import { formatPayloadDisplay } from '../utils/compliance'
import {
  dashboardData,
  ambianceData,
  lastMessages,
  MAX_LAST_MESSAGES,
  RATE_LIMIT_SECONDS,
  lastSaveTime,
  lastValueCache,
  moduleMessageCount,
  broadcastSse
} from '../utils/state'
import { evaluateMqttCompliance } from '../utils/compliance'
import type { AmbiancePayload, AmbianceEntry } from '../utils/types'
import {
  saveMeasurement,
  logMessageReceipt,
  logMqttMessage,
  logModulePublication,
  cleanupOldMqttMessages,
  getDb
} from '../utils/db'

let mqttClient: mqtt.MqttClient | null = null
let totalProcessedMessages = 0

export function getMqttClient() {
  return mqttClient
}

export function publishMqtt(topic: string, message: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!mqttClient || !mqttClient.connected) {
      return reject(new Error('Client MQTT non connecté au broker'))
    }
    mqttClient.publish(topic, message, { qos: 0 }, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export function publishMqttRetain(topic: string, message: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!mqttClient || !mqttClient.connected) {
      return reject(new Error('Client MQTT non connecté au broker'))
    }
    mqttClient.publish(topic, message, { qos: 0, retain: true }, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export default defineNitroPlugin(async () => {
  // Initialize Database on startup
  try {
    await getDb()
  } catch (err: any) {
    console.error('[DB Init Error]:', err.message)
  }

  const config = useRuntimeConfig()
  const brokerHost = process.env.NUXT_MQTT_BROKER || process.env.MQTT_BROKER || config.mqttBroker || '127.0.0.1'
  const brokerPort = parseInt(process.env.NUXT_MQTT_PORT || process.env.MQTT_PORT || String(config.mqttPort || '1883'), 10)
  const topic = process.env.NUXT_MQTT_TOPIC || process.env.MQTT_TOPIC || config.mqttTopic || 'bzh/mecatro/#'
  const brokerUrl = `mqtt://${brokerHost}:${brokerPort}`

  console.log(`[MQTT] 📡 Tentative de connexion au broker: ${brokerUrl}`)

  try {
    mqttClient = mqtt.connect(brokerUrl, {
      reconnectPeriod: 3000,
      connectTimeout: 5000,
      clientId: `nuxt_dashboard_${Math.random().toString(16).slice(2, 8)}`,
    })

    mqttClient.on('connect', () => {
      console.log(`[MQTT] ✅ Connecté au broker MQTT (${brokerUrl})`)
      mqttClient?.subscribe(config.mqttTopic, (err) => {
        if (err) {
          console.error(`[MQTT] ❌ Erreur abonnement ${config.mqttTopic}:`, err.message)
        } else {
          console.log(`[MQTT] 📡 Abonné avec succès au topic: ${config.mqttTopic}`)
        }
      })

      broadcastSse('broker_status', { connected: true, broker: brokerUrl })
    })

    mqttClient.on('disconnect', () => {
      console.warn('[MQTT] ⚠️ Déconnecté du broker MQTT.')
      broadcastSse('broker_status', { connected: false, broker: brokerUrl })
    })

    mqttClient.on('error', (err) => {
      console.error('[MQTT] ❌ Erreur client MQTT:', err.message)
      broadcastSse('broker_status', { connected: false, broker: brokerUrl, error: err.message })
    })

    mqttClient.on('message', async (topic, payloadBuffer) => {
      try {
        const payload = payloadBuffer.toString().trim()
        const timestamp = new Date().toISOString()
        totalProcessedMessages++

        // 1. Evaluate Topic + Payload Compliance
        const compliance = evaluateMqttCompliance(topic, payload)

        // 2. Log message receipt & detailed MQTT message
        await logMessageReceipt()
        if (topic.startsWith('bzh/mecatro/')) {
          await logMqttMessage(topic, payload, compliance.project, compliance.category, compliance.isCompliant)
        }

        // 3. Periodic Database Cleanup
        if (totalProcessedMessages % 1000 === 0) {
          cleanupOldMqttMessages().catch(console.error)
        }

        // 4. Record to recent messages feed
        const messageData = {
          topic,
          payload,
          timestamp,
          project: compliance.project,
          category: compliance.category,
          is_compliant: compliance.isCompliant
        }

        lastMessages.unshift(messageData)
        if (lastMessages.length > MAX_LAST_MESSAGES) {
          lastMessages.pop()
        }

        // Broadcast raw message to SSE
        broadcastSse('new_message', messageData)

        const parts = topic.split('/')

        // 5. Handle Dashboard Topic: bzh/mecatro/dashboard/<module>/<variable>
        //    Payload MUST be valid JSON with {valeur, unite, type, dateheure}
        if (parts.length >= 5 && parts[0] === 'bzh' && parts[1] === 'mecatro' && parts[2] === 'dashboard') {
          const module = parts[3]
          const variable = parts[4]

          // Increment module counter
          moduleMessageCount.set(module, (moduleMessageCount.get(module) || 0) + 1)

          // If payload is empty -> Delete variable
          if (!payload) {
            if (dashboardData[module] && dashboardData[module][variable]) {
              delete dashboardData[module][variable]
              if (Object.keys(dashboardData[module]).length === 0) {
                delete dashboardData[module]
              }
              broadcastSse('delete_data', { module, variable })
            }
            return
          }

          // Non-compliant messages (raw string, malformed JSON) are already flagged
          // by the compliance check. We still skip storing them to keep dashboard clean.
          if (!compliance.isCompliant) {
            console.warn(`[MQTT] ⚠️ Message dashboard NON CONFORME sur ${topic}: ${compliance.errorReason}`)
            broadcastSse('dashboard_error', {
              topic, module, variable,
              error: compliance.errorReason,
              timestamp
            })
            return
          }

          // Parse JSON payload
          let parsed: any
          try {
            parsed = JSON.parse(payload)
          } catch {
            console.error(`[MQTT] ❌ JSON parse failed for dashboard ${topic}`)
            return
          }

          // Format human-readable display value: "21.4 °C", "ouverte", "true"
          const displayValue = formatPayloadDisplay(parsed)

          // Add / Update variable in memory
          if (!dashboardData[module]) {
            dashboardData[module] = {}
          }
          dashboardData[module][variable] = {
            valeur: displayValue,
            derniere_maj: timestamp
          }

          // Rate Limiting (5 seconds per module:variable)
          const key = `${module}:${variable}`
          const now = Date.now()
          const lastSave = lastSaveTime.get(key) || 0
          const timeSinceLastSave = (now - lastSave) / 1000
          const valueChanged = lastValueCache.get(key) !== String(parsed.valeur)

          const shouldSave = timeSinceLastSave >= RATE_LIMIT_SECONDS || valueChanged

          if (shouldSave) {
            // Save numeric value to DB for sparklines, fallback to string
            await saveMeasurement(module, variable, String(parsed.valeur))
            await logModulePublication(module)
            lastSaveTime.set(key, now)
            lastValueCache.set(key, String(parsed.valeur))
          }

          // Broadcast real-time update to all web clients
          broadcastSse('update_data', {
            module,
            variable,
            value: displayValue,
            timestamp
          })
        }

        // 6. Handle Ambiance Topic: bzh/mecatro/ambiance/<grandeur>/<groupe>
        //    Payload MUST be valid JSON with {valeur, unite, type, dateheure}
        else if (parts.length === 5 && parts[0] === 'bzh' && parts[1] === 'mecatro' && parts[2] === 'ambiance') {
          const grandeur = parts[3]
          const groupe = parts[4]

          if (!compliance.isCompliant) {
            // Log but do not store — payload JSON invalid or topic non-conformant
            console.warn(`[MQTT] ⚠️ Message ambiance NON CONFORME sur ${topic}: ${compliance.errorReason}`)
            broadcastSse('ambiance_error', {
              topic,
              grandeur,
              groupe,
              error: compliance.errorReason,
              timestamp
            })
            return
          }

          // Parse the validated JSON payload
          const parsed: AmbiancePayload = JSON.parse(payload)

          // Store in memory
          if (!ambianceData[grandeur]) {
            ambianceData[grandeur] = {}
          }
          const entry: AmbianceEntry = {
            ...parsed,
            groupe,
            grandeur,
            derniere_maj: timestamp
          }
          ambianceData[grandeur][groupe] = entry

          console.log(`[MQTT] 🌡️ Ambiance reçue: ${grandeur}/${groupe} = ${parsed.valeur} ${parsed.unite}`)

          // Rate Limiting for DB save
          const key = `ambiance:${grandeur}:${groupe}`
          const now = Date.now()
          const lastSave = lastSaveTime.get(key) || 0
          const timeSinceLastSave = (now - lastSave) / 1000
          const valueChanged = lastValueCache.get(key) !== String(parsed.valeur)

          const shouldSave = timeSinceLastSave >= RATE_LIMIT_SECONDS || valueChanged

          if (shouldSave) {
            await saveMeasurement(`ambiance_${grandeur}`, groupe, String(parsed.valeur))
            await logModulePublication(`ambiance_${grandeur}`)
            lastSaveTime.set(key, now)
            lastValueCache.set(key, String(parsed.valeur))
          }

          // Broadcast real-time ambiance update
          broadcastSse('update_ambiance', {
            grandeur,
            groupe,
            entry,
            timestamp
          })
        }

      } catch (err: any) {
        console.error('[MQTT Message Handler Error]:', err.message)
      }
    })
  } catch (err: any) {
    console.error('[MQTT Init Error]:', err.message)
  }
})
