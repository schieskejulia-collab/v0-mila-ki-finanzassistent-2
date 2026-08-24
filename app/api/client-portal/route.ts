import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

async function resolvePortal(token: string) {
  const admin = getSupabaseAdmin()

  let link: any = null
  const withExpiry = await admin
    .from('client_upload_links')
    .select('user_id,client_id,case_id,active,expires_at')
    .eq('token', token)
    .eq('active', true)
    .maybeSingle()

  if (!withExpiry.error) {
    link = withExpiry.data
  } else {
    const fallback = await admin
      .from('client_upload_links')
      .select('user_id,client_id,case_id,active')
      .eq('token', token)
      .eq('active', true)
      .maybeSingle()
    link = fallback.data
  }

  if (!link) return null
  if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) return null

  const { data: client } = await admin
    .from('clients')
    .select('name')
    .eq('id', link.client_id)
    .eq('user_id', link.user_id)
    .maybeSingle()

  if (!client || !link.case_id) return null

  const { data: caseItem } = await admin
    .from('mila_intake_cases')
    .select('id,subject')
    .eq('id', link.case_id)
    .eq('client_id', link.client_id)
    .eq('user_id', link.user_id)
    .maybeSingle()

  if (!caseItem) return null
  return { admin, link, client, caseItem }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const token = String(url.searchParams.get('token') || '').trim()
    if (!token) return NextResponse.json({ error: 'Link unvollständig.' }, { status: 400 })

    const portal = await resolvePortal(token)
    if (!portal) return NextResponse.json({ error: 'Link ungültig, abgelaufen oder deaktiviert.' }, { status: 404 })

    const { data: questions, error } = await portal.admin
      .from('mila_case_updates')
      .select('id,content,status,created_at')
      .eq('user_id', portal.link.user_id)
      .eq('case_id', portal.caseItem.id)
      .eq('kind', 'question')
      .neq('status', 'done')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(
      {
        clientName: portal.client.name,
        caseSubject: portal.caseItem.subject,
        questions: (questions || []).map((question: any) => ({
          id: question.id,
          question: question.content,
          status: question.status,
        })),
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Portal konnte nicht geladen werden.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = String(body?.token || '').trim()
    const questionId = String(body?.questionId || '').trim()
    const answer = String(body?.answer || '').trim().slice(0, 4000)

    if (!token || !questionId || !answer) {
      return NextResponse.json({ error: 'Antwort unvollständig.' }, { status: 400 })
    }

    const portal = await resolvePortal(token)
    if (!portal) return NextResponse.json({ error: 'Link ungültig, abgelaufen oder deaktiviert.' }, { status: 404 })

    const { data: question } = await portal.admin
      .from('mila_case_updates')
      .select('id')
      .eq('id', questionId)
      .eq('user_id', portal.link.user_id)
      .eq('case_id', portal.caseItem.id)
      .eq('kind', 'question')
      .neq('status', 'done')
      .maybeSingle()

    if (!question) return NextResponse.json({ error: 'Rückfrage nicht gefunden.' }, { status: 404 })

    const now = new Date().toISOString()
    const { error } = await portal.admin
      .from('mila_case_updates')
      .update({ status: 'done' })
      .eq('id', questionId)
      .eq('user_id', portal.link.user_id)
      .eq('case_id', portal.caseItem.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { error: answerError } = await portal.admin.from('mila_case_updates').insert({
      user_id: portal.link.user_id,
      case_id: portal.caseItem.id,
      kind: 'answer',
      content: answer,
      status: 'done',
      created_at: now,
    })
    if (answerError) return NextResponse.json({ error: answerError.message }, { status: 500 })

    const { count: remainingQuestions } = await portal.admin
      .from('mila_case_updates')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', portal.link.user_id)
      .eq('case_id', portal.caseItem.id)
      .eq('kind', 'question')
      .neq('status', 'done')

    if ((remainingQuestions || 0) === 0) {
      await portal.admin
        .from('mila_intake_cases')
        .update({ status: 'in_progress' })
        .eq('id', portal.caseItem.id)
        .eq('user_id', portal.link.user_id)
        .eq('status', 'needs_info')
    }

    if ('expires_at' in portal.link) {
      await portal.admin
        .from('client_upload_links')
        .update({ last_used_at: new Date().toISOString() })
        .eq('token', token)
        .eq('active', true)
    }

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Antwort konnte nicht gespeichert werden.' }, { status: 500 })
  }
}
