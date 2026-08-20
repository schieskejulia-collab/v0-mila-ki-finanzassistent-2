import { NextResponse } from 'next/server'
import { requireSupabaseUser } from '@/lib/supabase-server'
import { assessCaseReadiness } from '@/lib/case-readiness'

type HandoffRequest = {
  caseId?: string
  clientId?: string
}

export async function POST(req: Request) {
  try {
    const { client, user, error: authError } = await requireSupabaseUser(req)
    if (authError || !user) {
      return NextResponse.json({ success: false, error: authError || 'Nicht angemeldet.' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as HandoffRequest
    const caseId = body.caseId?.trim()
    const clientId = body.clientId?.trim()

    if (!caseId || !clientId) {
      return NextResponse.json({ success: false, error: 'Vorgang oder aktive Akte fehlt.' }, { status: 400 })
    }

    const [caseResult, documentResult, taskResult, updateResult, eventResult] = await Promise.all([
      client
        .from('mila_intake_cases')
        .select('*')
        .eq('id', caseId)
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .maybeSingle(),
      client
        .from('documents')
        .select('id,client_id,case_id,title,partner,note,type,status,document_date,file_name,file_url,created_at')
        .eq('case_id', caseId)
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
      client
        .from('mila_coordination_tasks')
        .select('*')
        .eq('case_id', caseId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
      client
        .from('mila_case_updates')
        .select('*')
        .eq('case_id', caseId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
      client
        .from('mila_case_events')
        .select('*')
        .eq('case_id', caseId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
    ])

    if (caseResult.error || !caseResult.data) {
      return NextResponse.json({ success: false, error: 'Vorgang gehört nicht zur aktiven Akte oder wurde nicht gefunden.' }, { status: 404 })
    }

    if (documentResult.error || taskResult.error || updateResult.error || eventResult.error) {
      return NextResponse.json({ success: false, error: 'Mila konnte den vollständigen Vorgangsstand nicht laden.' }, { status: 500 })
    }

    const currentCase = caseResult.data
    const documents = documentResult.data || []
    const tasks = taskResult.data || []
    const updates = updateResult.data || []
    const events = eventResult.data || []

    const readiness = assessCaseReadiness({
      status: currentCase.status,
      documents,
      tasks,
      updates,
    })

    if (!readiness.ready) {
      return NextResponse.json(
        {
          success: false,
          error: `Noch nicht übergabebereit: ${readiness.blockers.map((item) => item.label).join(' · ')}`,
          readiness,
        },
        { status: 409 },
      )
    }

    const handoffSummary = [
      `Anliegen: ${currentCase.subject}`,
      `Unterlagen: ${documents.length}`,
      `Kontakt: ${currentCase.caller_name || currentCase.company || 'noch offen'}`,
      currentCase.phone ? `Telefon: ${currentCase.phone}` : null,
      currentCase.email ? `E-Mail: ${currentCase.email}` : null,
      `Zusammenfassung: ${currentCase.summary || ''}`,
      `Zuständig: ${currentCase.assigned_to || 'noch offen'}`,
      'Organisatorisch vollständig: ja',
    ]
      .filter(Boolean)
      .join('\n')

    const previousState = {
      status: currentCase.status,
      handoff_ready: currentCase.handoff_ready,
      handoff_summary: currentCase.handoff_summary,
    }

    const { error: updateError } = await client
      .from('mila_intake_cases')
      .update({
        status: 'human_review',
        handoff_ready: true,
        handoff_summary: handoffSummary,
      })
      .eq('id', caseId)
      .eq('user_id', user.id)
      .eq('client_id', clientId)

    if (updateError) {
      return NextResponse.json({ success: false, error: 'Übergabe konnte nicht vorbereitet werden.' }, { status: 500 })
    }

    const { data: refreshedEvents } = await client
      .from('mila_case_events')
      .select('*')
      .eq('case_id', caseId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    const { data: lastHandoff, error: versionError } = await client
      .from('mila_case_handoffs')
      .select('version')
      .eq('case_id', caseId)
      .eq('user_id', user.id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (versionError) {
      await client
        .from('mila_intake_cases')
        .update(previousState)
        .eq('id', caseId)
        .eq('user_id', user.id)
      return NextResponse.json({ success: false, error: 'Übergabeversion konnte nicht bestimmt werden.' }, { status: 500 })
    }

    const version = (lastHandoff?.version || 0) + 1
    const capturedAt = new Date().toISOString()
    const snapshot = {
      format: 'mila-handoff-snapshot',
      format_version: 1,
      captured_at: capturedAt,
      readiness,
      case: {
        ...currentCase,
        status: 'human_review',
        handoff_ready: true,
        handoff_summary: handoffSummary,
      },
      documents,
      updates,
      tasks,
      events: refreshedEvents || events,
    }

    const { data: handoff, error: insertError } = await client
      .from('mila_case_handoffs')
      .insert({
        user_id: user.id,
        case_id: caseId,
        version,
        summary: handoffSummary,
        snapshot,
      })
      .select('id,version,created_at')
      .single()

    if (insertError || !handoff) {
      await client
        .from('mila_intake_cases')
        .update(previousState)
        .eq('id', caseId)
        .eq('user_id', user.id)
      return NextResponse.json({ success: false, error: 'Übergabestand konnte nicht versioniert archiviert werden.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      caseId,
      clientId,
      handoff,
      summary: handoffSummary,
      readiness,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Übergabe konnte nicht erstellt werden.' },
      { status: 500 },
    )
  }
}
