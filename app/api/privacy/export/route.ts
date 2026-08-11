import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TABLES = [
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

export async function GET(request: NextRequest) {
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

  const exportData: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
    },
    tables: {},
    skipped: [],
  }

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select('*')

    if (error) {
      ;(exportData.skipped as unknown[]).push({ table, reason: error.message })
      continue
    }

    ;(exportData.tables as Record<string, unknown>)[table] = data ?? []
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="mila-datenexport.json"',
      'Cache-Control': 'no-store',
    },
  })
}