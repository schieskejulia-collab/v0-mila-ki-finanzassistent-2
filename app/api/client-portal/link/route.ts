import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000

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
    const caseId = String(body?.caseId || '').trim()
    if (!clientId || !caseId) {
      return NextResponse.json({ error: 'Akte oder Vorgang fehlt.' }, { status: 400 })
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

    const { data: caseItem, error: caseError } = await admin
      .from('mila_intake_cases')
      .select('id,subject')
      .eq('id', caseId)
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (caseError || !caseItem) {
      return NextResponse.json({ error: 'Vorgang nicht gefunden.' }, { status: 404 })
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + LINK_TTL_MS).toISOString()

    let existing: any = null
    const existingWithExpiry = await admin
      .from('client_upload_links')
      .select('token,expires_at')
      .eq('user_id', user.id)
      .eq('client_id', clientId)
      .eq('case_id', caseId)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!existingWithExpiry.error) {
      existing = existingWithExpiry.data
    } else {
      const fallback = await admin
        .from('client_upload_links')
        .select('token')
        .eq('user_id', user.id)
        .eq('client_id', clientId)
        .eq('case_id', caseId)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      existing = fallback.data
    }

    const existingValid =
      existing?.token &&
      (!existing?.expires_at || new Date(existing.expires_at).getTime() > now.getTime())

    let portalToken = existingValid ? existing.token : null
    let portalExpiresAt = existingValid ? existing.expires_at || null : null

    if (!portalToken) {
      await admin
        .from('client_upload_links')
        .update({ active: false })
        .eq('user_id', user.id)
        .eq('client_id', clientId)
        .eq('case_id', caseId)
        .eq('active', true)

      let createdResult = await admin
        .from('client_upload_links')
        .insert({ user_id: user.id, client_id: clientId, case_id: caseId, active: true, expires_at: expiresAt })
        .select('token,expires_at')
        .single()

      if (createdResult.error) {
        createdResult = await admin
          .from('client_upload_links')
          .insert({ user_id: user.id, client_id: clientId, case_id: caseId, active: true })
          .select('token')
          .single() as any
      }

      if (createdResult.error || !createdResult.data) {
        return NextResponse.json({ error: createdResult.error?.message || 'Link konnte nicht erstellt werden.' }, { status: 500 })
      }

      portalToken = createdResult.data.token
      portalExpiresAt = createdResult.data.expires_at || null
    }

    const origin = new URL(request.url).origin
    return NextResponse.json(
      {
        clientName: client.name,
        caseSubject: caseItem.subject,
        url: `${origin}/mandant-upload?token=${encodeURIComponent(portalToken)}`,
        expiresAt: portalExpiresAt,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Mandanten-Link konnte nicht erstellt werden.' }, { status: 500 })
  }
}
