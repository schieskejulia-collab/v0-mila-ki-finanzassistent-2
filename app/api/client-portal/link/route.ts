import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

function bearerToken(request: Request) {
  const value = request.headers.get('authorization') || ''
  return value.startsWith('Bearer ') ? value.slice(7).trim() : ''
}

export async function POST(request: Request) {
  try {
    const token = bearerToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    const user = userData?.user

    if (userError || !user) {
      return NextResponse.json({ error: 'Sitzung ungültig.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const clientId = String(body?.clientId || '').trim()
    if (!clientId) {
      return NextResponse.json({ error: 'Mandant fehlt.' }, { status: 400 })
    }

    const { data: client, error: clientError } = await admin
      .from('clients')
      .select('id,name')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Mandant nicht gefunden.' }, { status: 404 })
    }

    const { data: existing } = await admin
      .from('client_upload_links')
      .select('token')
      .eq('user_id', user.id)
      .eq('client_id', clientId)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let portalToken = existing?.token

    if (!portalToken) {
      const { data: created, error: createError } = await admin
        .from('client_upload_links')
        .insert({ user_id: user.id, client_id: clientId, active: true })
        .select('token')
        .single()

      if (createError || !created) {
        return NextResponse.json({ error: createError?.message || 'Link konnte nicht erstellt werden.' }, { status: 500 })
      }

      portalToken = created.token
    }

    const origin = new URL(request.url).origin
    return NextResponse.json({
      clientName: client.name,
      url: `${origin}/mandant-upload?token=${encodeURIComponent(portalToken)}`,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Mandanten-Link konnte nicht erstellt werden.' }, { status: 500 })
  }
}
