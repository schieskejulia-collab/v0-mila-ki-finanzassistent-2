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

    const [caseResult, documentResult, taskResult, updateResult] = await Promise.all([
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
    ])

    if (caseResult.error || !caseResult.data) {
      return NextResponse.json(
        { success: false, error: 'Vorgang gehört nicht zur aktiven Akte oder wurde nicht gefunden.' },
        { status: 404 },
      )
    }

    if (documentResult.error || taskResult.error || updateResult.error) {
      return NextResponse.json(
        { success: false, error: 'Mila konnte den vollständigen Vorgangsstand nicht laden.' },
        { status: 500 },
      )
    }

    const currentCase = caseResult.data
    const documents = documentResult.data || []
    const tasks = taskResult.data || []
    const updates = updateResult.data || []
    const readiness = assessCaseReadiness({ status: currentCase.status, documents, tasks, updates })

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

    const { error: updateError } = await client
      .from('mila_intake_cases')
      .update({ status: 'human_review', handoff_ready: true, handoff_summary: handoffSummary })
      .eq('id', caseId)
      .eq('user_id', user.id)
      .eq('client_id', clientId)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message || 'Übergabe konnte nicht vorbereitet werden.' },
        { status: 500 },
      )
    }

    // Der unveränderliche Snapshot wird zentral durch den DB-Trigger erzeugt,
    // sobald handoff_ready von false auf true wechselt. So gibt es unabhängig
    // von der UI nur einen einzigen Versionierungsweg.
    const { data: handoff, error: handoffError } = await client
      .from('mila_case_handoffs')
      .select('id,version,created_at')
      .eq('case_id', caseId)
      .eq('user_id', user.id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (handoffError || !handoff) {
      return NextResponse.json(
        { success: false, error: 'Übergabe wurde vorbereitet, aber der archivierte Stand konnte nicht bestätigt werden.' },
        { status: 500 },
      )
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
