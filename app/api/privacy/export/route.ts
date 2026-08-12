import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TABLES = [
  'expenses',
  'incomes',
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
  'merchant_memory',
  'clients',
  'client_questions',
  'client_upload_links',
  'notifications',
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
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
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
    user: { id: user.id, email: user.email },
    tables: {},
    skipped: [],
    note: 'Der Export enthält nur Datensätze, die über die aktive Nutzer-Session zugreifbar sind. Tabellen, die in einer Installation nicht existieren, werden unter skipped dokumentiert.',
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
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
