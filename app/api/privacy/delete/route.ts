import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const USER_TABLES = [
  'client_questions',
  'client_upload_links',
  'notifications',
  'documents',
  'clients',
  'merchant_memory',
  'goals',
  'obligations',
  'incomes',
  'expenses',
  'projects',
  'categories',
  'tax_summaries',
  'alerts',
  'recurring_expenses',
  'user_profile',
  'monthly_summaries',
  'crm_contacts',
  'mileage_log',
]

function bearerToken(request: Request) {
  const value = request.headers.get('authorization') || ''
  return value.startsWith('Bearer ') ? value.slice(7).trim() : ''
}

export async function POST(request: NextRequest) {
  const token = bearerToken(request)
  if (!token) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  const user = userData?.user

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

  const { data: objects, error: listError } = await admin.storage
    .from('client-uploads')
    .list(user.id, { limit: 1000 })

  if (!listError && Array.isArray(objects)) {
    const paths: string[] = []
    for (const clientFolder of objects) {
      const { data: clientObjects } = await admin.storage
        .from('client-uploads')
        .list(`${user.id}/${clientFolder.name}`, { limit: 1000 })
      for (const object of clientObjects || []) {
        if (object.name) paths.push(`${user.id}/${clientFolder.name}/${object.name}`)
      }
    }
    if (paths.length > 0) {
      await admin.storage.from('client-uploads').remove(paths)
    }
  }

  for (const table of USER_TABLES) {
    const { error } = await admin.from(table).delete().eq('user_id', user.id)
    if (error) {
      skipped.push({ table, reason: error.message })
      continue
    }
    deleted.push(table)
  }

  return NextResponse.json(
    {
      ok: skipped.length === 0,
      message:
        skipped.length === 0
          ? 'Nutzerdaten und zuordenbare Mandanten-Uploads wurden gelöscht. Das Auth-Konto bleibt bestehen.'
          : 'Die Löschung wurde ausgeführt, aber nicht alle optionalen Tabellen konnten verarbeitet werden.',
      deleted,
      skipped,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        Pragma: 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    }
  )
}
