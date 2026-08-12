export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSupabaseUser } from '@/lib/supabase-server'

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

  const { data: folders } = await admin.storage.from('client-uploads').list(user.id, { limit: 1000 })
  const uploadPaths: string[] = []
  for (const folder of folders || []) {
    const { data: files } = await admin.storage
      .from('client-uploads')
      .list(`${user.id}/${folder.name}`, { limit: 1000 })
    for (const file of files || []) {
      if (file.name) uploadPaths.push(`${user.id}/${folder.name}/${file.name}`)
    }
  }
  if (uploadPaths.length > 0) {
    await admin.storage.from('client-uploads').remove(uploadPaths)
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
    { success: true },
    { headers: { 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache' } }
  )
}
