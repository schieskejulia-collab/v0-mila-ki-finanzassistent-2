export type TripType = 'betrieblich' | 'privat' | 'arbeitsweg'

export interface FahrtenbuchEntry {
  id: string
  user_id?: string
  trip_date: string
  start_location: string
  destination: string
  purpose: string
  distance_km: number
  trip_type: TripType
  business_partner: string
  vehicle: string
  start_time?: string | null
  end_time?: string | null
  return_trip: boolean
  route: string
  notes: string
  created_at: string
  updated_at?: string
}

export const FAHRTENBUCH_LOCAL_PREFIX = 'mila-fahrtenbuch-'

export function fahrtenbuchLocalKey(userId?: string) {
  return `${FAHRTENBUCH_LOCAL_PREFIX}${userId || 'guest'}`
}

export function createFahrtenbuchId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return `fahrt-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function todayAsInputValue() {
  return new Date().toISOString().slice(0, 10)
}