import { createClient } from '@supabase/supabase-js'

// Mila Mobile uses its own Supabase project. Never fall back to PetraPlan or a
// retired Mila database when an old Vercel environment is still configured.
const ACTIVE_SUPABASE_URL = 'https://avzjzxhvoahypwaosifd.supabase.co'
const ACTIVE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_oN-w7C31Vdn4WRLgOxioIg_IzXEtT6j'

const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const configuredKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)?.trim()

const configuredForMila = Boolean(
  configuredUrl?.includes('avzjzxhvoahypwaosifd.supabase.co') && configuredKey
)

const supabaseUrl: string = configuredForMila && configuredUrl
  ? configuredUrl
  : ACTIVE_SUPABASE_URL

const supabaseAnonKey: string = configuredForMila && configuredKey
  ? configuredKey
  : ACTIVE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = true

const baseSupabase = createClient(supabaseUrl, supabaseAnonKey)

export const ACTIVE_CLIENT_KEY = 'mila-active-client-v1'
const NO_ACTIVE_CLIENT = '__mila_no_active_client__'

const CLIENT_SCOPED_TABLES = new Set([
  'expenses',
  'incomes',
  'obligations',
  'documents',
  'client_questions',
  'mila_intake_cases',
])

export function getActiveClientId() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(ACTIVE_CLIENT_KEY) || ''
}

function requireActiveClientId() {
  const clientId = getActiveClientId()

  if (!clientId) {
    throw new Error(
      'Bitte zuerst oben einen Mandanten auswählen. Mila speichert keine Mandantendaten ohne eindeutige Zuordnung.'
    )
  }

  return clientId
}

function addClientId(values: any, clientId: string) {
  if (Array.isArray(values)) {
    return values.map((value) => ({
      ...value,
      client_id: value?.client_id || clientId,
    }))
  }

  return {
    ...values,
    client_id: values?.client_id || clientId,
  }
}

function scopeRead(builder: any, clientId: string) {
  return builder.eq('client_id', clientId || NO_ACTIVE_CLIENT)
}

function scopeWrite(builder: any, clientId: string) {
  return builder.eq('client_id', clientId)
}

export const supabase = new Proxy(baseSupabase, {
  get(target, property, receiver) {
    if (property !== 'from') {
      return Reflect.get(target, property, receiver)
    }

    return (table: string) => {
      const builder: any = target.from(table as any)

      if (!CLIENT_SCOPED_TABLES.has(table)) {
        return builder
      }

      return new Proxy(builder, {
        get(tableTarget, method, tableReceiver) {
          if (method === 'select') {
            return (...args: any[]) => scopeRead(tableTarget.select(...args), getActiveClientId())
          }

          if (method === 'insert') {
            return (values: any, options?: any) => {
              const clientId = requireActiveClientId()
              return tableTarget.insert(addClientId(values, clientId), options)
            }
          }

          if (method === 'upsert') {
            return (values: any, options?: any) => {
              const clientId = requireActiveClientId()
              return tableTarget.upsert(addClientId(values, clientId), options)
            }
          }

          if (method === 'update') {
            return (values: any, options?: any) => {
              const clientId = requireActiveClientId()
              return scopeWrite(tableTarget.update(values, options), clientId)
            }
          }

          if (method === 'delete') {
            return (options?: any) => {
              const clientId = requireActiveClientId()
              return scopeWrite(tableTarget.delete(options), clientId)
            }
          }

          return Reflect.get(tableTarget, method, tableReceiver)
        },
      })
    }
  },
}) as typeof baseSupabase
