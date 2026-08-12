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

const ACTIVE_CLIENT_KEY = 'mila-active-client-v1'
const CLIENT_SCOPED_TABLES = new Set([
  'expenses',
  'incomes',
  'obligations',
  'documents',
])

function getActiveClientId() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(ACTIVE_CLIENT_KEY) || ''
}

function addClientId(values: any, clientId: string) {
  if (!clientId) return values

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

function scopeResult(builder: any, clientId: string) {
  return clientId
    ? builder.eq('client_id', clientId)
    : builder
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
              scopeResult(
                tableTarget.select(...args),
                getActiveClientId()
              )
          }

          if (method === 'insert') {
            return (values: any, options?: any) =>
              tableTarget.insert(
                addClientId(values, getActiveClientId()),
                options
              )
          }

          if (method === 'upsert') {
            return (values: any, options?: any) =>
              tableTarget.upsert(
                addClientId(values, getActiveClientId()),
                options
              )
          }

          if (method === 'update') {
            return (values: any, options?: any) =>
              scopeResult(
                tableTarget.update(values, options),
                getActiveClientId()
              )
          }

          if (method === 'delete') {
            return (options?: any) =>
              scopeResult(
                tableTarget.delete(options),
                getActiveClientId()
              )
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
