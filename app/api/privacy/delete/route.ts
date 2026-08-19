import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { deleteUserStoredFiles } from '@/lib/user-storage-cleanup'

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
  const storageCleanup = await deleteUserStoredFiles(admin, user.id)

  if (storageCleanup.failures.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Private Dokumentdateien konnten nicht vollständig gelöscht werden. Die Datenbanklöschung wurde deshalb nicht fortgesetzt.',
        storageFailures: storageCleanup.failures,
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          Pragma: 'no-cache',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    )
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
          ? 'Nutzerdaten und zuordenbare private Dokumentdateien wurden gelöscht. Das Auth-Konto bleibt bestehen.'
          : 'Die Löschung wurde ausgeführt, aber nicht alle optionalen Tabellen konnten verarbeitet werden.',
      deleted,
      skipped,
      removedFiles: storageCleanup.removed,
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
