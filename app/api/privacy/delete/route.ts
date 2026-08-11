import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const USER_TABLES = [
  'expenses',
  'income',
  'projects',
  'categories',
  'tax_summaries',
  'goals',
  'alerts',
  'recurring_expenses',
  'user_profile',
  'monthly_summaries',
  'crm_contacts',
  'documents',
  'obligations',
  'mileage_log',
]

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase ist nicht konfiguriert.' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')

  if (!authHeader) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Session ungültig.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)

  if (body?.confirm !== 'MILA_DATEN_LOESCHEN') {
    return NextResponse.json(
      { error: 'Bestätigung fehlt. Sende confirm: MILA_DATEN_LOESCHEN.' },
      { status: 400 }
    )
  }

  const deleted: string[] = []
  const skipped: Array<{ table: string; reason: string }> = []

  for (const table of USER_TABLES) {
    const { error } = await supabase.from(table).delete().eq('user_id', user.id)

    if (error) {
      skipped.push({ table, reason: error.message })
      continue
    }

    deleted.push(table)
  }

  return NextResponse.json(
    {
      ok: true,
      message:
        'Nutzerdaten wurden soweit technisch möglich gelöscht. Das Auth-Konto muss separat über Supabase Admin oder eine Service-Role-Funktion entfernt werden.',
      deleted,
      skipped,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}