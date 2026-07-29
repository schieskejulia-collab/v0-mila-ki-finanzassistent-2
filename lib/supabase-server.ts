import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

function getBearerToken(req: Request) {
  const authorization = req.headers.get('authorization') || ''

  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return ''
  }

  return authorization.slice('bearer '.length).trim()
}

export function createSupabaseRouteClient(req: Request) {
  const token = getBearerToken(req)

  const client = createClient(
    supabaseUrl || 'https://mila-not-configured.supabase.co',
    supabaseAnonKey || 'mila-not-configured',
    {
      global: token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        : undefined,
    }
  )

  return { client, token }
}

export async function requireSupabaseUser(req: Request) {
  const { client, token } = createSupabaseRouteClient(req)

  if (!token) {
    return {
      client,
      user: null,
      error: 'Nicht angemeldet.',
    }
  }

  const {
    data: { user },
    error,
  } = await client.auth.getUser(token)

  if (error || !user) {
    return {
      client,
      user: null,
      error: 'Sitzung ungültig oder abgelaufen.',
    }
  }

  return { client, user, error: null }
}
