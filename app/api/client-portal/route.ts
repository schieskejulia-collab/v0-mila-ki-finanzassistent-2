import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

async function resolvePortal(token: string) {
  const admin = getSupabaseAdmin()
  const { data: link, error } = await admin
    .from('client_upload_links')
    .select('user_id,client_id,active')
    .eq('token', token)
    .eq('active', true)
    .maybeSingle()

  if (error || !link) return null

  const { data: client } = await admin
    .from('clients')
    .select('name')
    .eq('id', link.client_id)
    .eq('user_id', link.user_id)
    .maybeSingle()

  if (!client) return null
  return { admin, link, client }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const token = String(url.searchParams.get('token') || '').trim()
    if (!token) return NextResponse.json({ error: 'Link unvollständig.' }, { status: 400 })

    const portal = await resolvePortal(token)
    if (!portal) return NextResponse.json({ error: 'Link ungültig oder deaktiviert.' }, { status: 404 })

    const { data: questions, error } = await portal.admin
      .from('client_questions')
      .select('id,question,answer,status,created_at')
      .eq('user_id', portal.link.user_id)
      .eq('client_id', portal.link.client_id)
      .neq('status', 'erledigt')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ clientName: portal.client.name, questions: questions || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Portal konnte nicht geladen werden.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = String(body?.token || '').trim()
    const questionId = String(body?.questionId || '').trim()
    const answer = String(body?.answer || '').trim()

    if (!token || !questionId || !answer) {
      return NextResponse.json({ error: 'Antwort unvollständig.' }, { status: 400 })
    }

    const portal = await resolvePortal(token)
    if (!portal) return NextResponse.json({ error: 'Link ungültig oder deaktiviert.' }, { status: 404 })

    const { data: question } = await portal.admin
      .from('client_questions')
      .select('id')
      .eq('id', questionId)
      .eq('user_id', portal.link.user_id)
      .eq('client_id', portal.link.client_id)
      .neq('status', 'erledigt')
      .maybeSingle()

    if (!question) return NextResponse.json({ error: 'Rückfrage nicht gefunden.' }, { status: 404 })

    const { error } = await portal.admin
      .from('client_questions')
      .update({ answer, status: 'beantwortet', answered_at: new Date().toISOString() })
      .eq('id', questionId)
      .eq('user_id', portal.link.user_id)
      .eq('client_id', portal.link.client_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Antwort konnte nicht gespeichert werden.' }, { status: 500 })
  }
}
