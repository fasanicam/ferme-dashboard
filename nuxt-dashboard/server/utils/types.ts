// server/utils/types.ts

export interface SensorValue {
  valeur: string
  derniere_maj: string
}

export interface DashboardData {
  [module: string]: {
    [variable: string]: SensorValue
  }
}

// ---- Ambiance (données environnementales partagées) ----

export type AmbianceType = 'float' | 'int' | 'bool' | 'string'

export interface AmbiancePayload {
  valeur: number | boolean | string
  unite: string
  type: AmbianceType
  dateheure: string
}

export interface AmbianceEntry extends AmbiancePayload {
  groupe: string
  grandeur: string
  derniere_maj: string
}

export interface AmbianceData {
  [grandeur: string]: {
    [groupe: string]: AmbianceEntry
  }
}

// Liste des grandeurs normalisées autorisées (table du guide IoT)
export const GRANDEURS_NORMALISEES: Record<string, { unite: string; type: AmbianceType }> = {
  temperature:  { unite: '°C',       type: 'float' },
  humidite:     { unite: '%',        type: 'float' },
  pression:     { unite: 'hPa',      type: 'int'   },
  luminosite:   { unite: 'lx',       type: 'int'   },
  co2:          { unite: 'ppm',      type: 'int'   },
  qualite_air:  { unite: 'IAQ',      type: 'int'   },
  bruit:        { unite: 'dB',       type: 'int'   },
  pluvio:       { unite: 'mm/h',     type: 'float' },
  vent_vitesse: { unite: 'km/h',     type: 'float' },
}

// ---- MQTT ----

export interface MqttMessageRecord {
  id?: number
  topic: string
  payload: string
  timestamp: string
  project?: string | null
  category?: string
  is_compliant?: boolean
}

export interface ComplianceResult {
  project: string | null
  category: string
  isCompliant: boolean
  errorReason: string | null
  payloadError: string | null  // null si payload valide ou non applicable
}

export interface GlobalMqttStats {
  total_messages: number
  compliant_messages: number
  non_compliant_messages: number
  compliance_rate: number
  active_projects: number
  categories: Record<string, number>
  unknown_traffic: number
}

export interface ProjectAnalysis {
  name: string
  total: number
  compliant: number
  compliance_rate: number
  last_seen: string
  score: number
  volume: string
}

export interface ProjectDetails {
  project: string
  stats: {
    total: number
    compliant: number
    first_seen: string | null
    last_seen: string | null
  } | null
  errors: Array<{ topic: string; count: number }>
  frequency: {
    data: Array<{ minute: string; count: number }>
    max: number
    avg: number
  }
  categories: Array<{ category: string; count: number }>
  top_topics: Array<{ topic: string; count: number; last_seen: string | null }>
  timeline: Array<{ hour: string; count: number }>
  recent_messages: Array<{ topic: string; payload: string; timestamp: string; is_compliant: boolean }>
}

export interface RateLimitItem {
  module: string
  variable: string
  last_save: string
  seconds_since: number
  is_limited: boolean
}
