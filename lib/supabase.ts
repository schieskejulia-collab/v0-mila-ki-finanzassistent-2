import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey
)

const baseSupabase = createClient(
  supabaseUrl || 'https://mila-not-configured.supabase.co',
  supabaseAnonKey || 'mila-not-configured'
)

export const ACTIVE_CLIENT_KEY = 'mila-active-client-v1'
const NO_ACTIVE_CLIENT = '__mila_no_active_client__'

const CLIENT_SCOPED_TABLES = new Set([
  'expenses',
  'incomes',
  'obligations',
  'documents',
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
  // Ohne aktiven Mandanten niemals versehentlich Daten aller Mandanten laden.
  return builder.eq(
    'client_id',
    clientId || NO_ACTIVE_CLIENT
  )
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
            return (...args: any[]) =>
              scopeRead(
                tableTarget.select(...args),
                getActiveClientId()
              )
          }

          if (method === 'insert') {
            return (values: any, options?: any) => {
              const clientId = requireActiveClientId()
              return tableTarget.insert(
                addClientId(values, clientId),
                options
              )
            }
          }

          if (method === 'upsert') {
            return (values: any, options?: any) => {
              const clientId = requireActiveClientId()
              return tableTarget.upsert(
                addClientId(values, clientId),
                options
              )
            }
          }

          if (method === 'update') {
            return (values: any, options?: any) => {
              const clientId = requireActiveClientId()
              return scopeWrite(
                tableTarget.update(values, options),
                clientId
              )
            }
          }

          if (method === 'delete') {
            return (options?: any) => {
              const clientId = requireActiveClientId()
              return scopeWrite(
                tableTarget.delete(options),
                clientId
              )
            }
          }

          return Reflect.get(
            tableTarget,
            method,
            tableReceiver
          )
        },
      })
    }
  },
}) as typeof baseSupabase
