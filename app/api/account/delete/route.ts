export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSupabaseUser } from '@/lib/supabase-server'
import { deleteUserStoredFiles } from '@/lib/user-storage-cleanup'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

const userOwnedTables = [
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

export async function DELETE(req: Request) {
  const { user, error: authError } = await requireSupabaseUser(req)

  if (authError || !user) {
    return NextResponse.json({ success: false, error: authError }, { status: 401 })
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { success: false, error: 'Konto-Löschung ist serverseitig noch nicht konfiguriert.' },
      { status: 501 }
    )
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const storageCleanup = await deleteUserStoredFiles(admin, user.id)
  if (storageCleanup.failures.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'Private Dokumentdateien konnten nicht vollständig gelöscht werden. Das Auth-Konto wurde deshalb nicht entfernt.',
        storageFailures: storageCleanup.failures,
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const failures: Array<{ table: string; error: string }> = []
  for (const table of userOwnedTables) {
    const { error } = await admin.from(table).delete().eq('user_id', user.id)
    if (error) failures.push({ table, error: error.message })
  }

  if (failures.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'Nicht alle Nutzerdaten konnten sicher gelöscht werden. Das Auth-Konto wurde deshalb nicht entfernt.',
        failures,
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteUserError) {
    return NextResponse.json(
      { success: false, error: `Nutzerkonto konnte nicht gelöscht werden: ${deleteUserError.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { success: true, removedFiles: storageCleanup.removed },
    { headers: { 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache' } }
  )
}
