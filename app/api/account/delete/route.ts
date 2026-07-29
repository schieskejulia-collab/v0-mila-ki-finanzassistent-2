export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSupabaseUser } from '@/lib/supabase-server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

const userOwnedTables = [
  'merchant_memory',
  'goals',
  'obligations',
  'incomes',
  'expenses',
]

export async function DELETE(req: Request) {
  const { user, error: authError } = await requireSupabaseUser(req)

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: authError },
      { status: 401 }
    )
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Konto-Löschung ist serverseitig noch nicht konfiguriert.',
      },
      { status: 501 }
    )
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  for (const table of userOwnedTables) {
    const { error } = await admin
      .from(table)
      .delete()
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Daten aus ${table} konnten nicht gelöscht werden: ${error.message}`,
        },
        { status: 500 }
      )
    }
  }

  const { error: deleteUserError } =
    await admin.auth.admin.deleteUser(user.id)

  if (deleteUserError) {
    return NextResponse.json(
      {
        success: false,
        error: `Nutzerkonto konnte nicht gelöscht werden: ${deleteUserError.message}`,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}