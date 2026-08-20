import { NextResponse } from 'next/server'
import { requireSupabaseUser } from '@/lib/supabase-server'

function cookieValue(req: Request, key: string) {
  const raw = req.headers.get('cookie') || ''
  const match = raw.split(';').map(part => part.trim()).find(part => part.startsWith(`${key}=`))
  if (!match) return null
  try { return decodeURIComponent(match.slice(key.length + 1)) || null } catch { return match.slice(key.length + 1) || null }
}

export async function GET(req: Request) {
  const { client, user, error: authError } = await requireSupabaseUser(req)
  if (authError || !user) return NextResponse.json({ success: false, error: authError || 'Nicht angemeldet' }, { status: 401 })

  const url = new URL(req.url)
  const requestedCaseId = url.searchParams.get('case')
  const activeClientId = url.searchParams.get('client') || cookieValue(req, 'mila_active_client')
  if (!activeClientId) return NextResponse.json({ success: false, error: 'Bitte zuerst eine aktive Akte auswählen' }, { status: 409 })

  let caseQuery = client
    .from('mila_intake_cases')
    .select('id,client_id,subject,status,handoff_ready,completed_at')
    .eq('user_id', user.id)
    .eq('client_id', activeClientId)
    .order('created_at', { ascending: false })

  if (requestedCaseId) caseQuery = caseQuery.eq('id', requestedCaseId)
  const { data: cases, error: caseError } = await caseQuery
  if (caseError) return NextResponse.json({ success: false, error: caseError.message }, { status: 500 })

  const ids = (cases || []).map(item => item.id)
  if (ids.length === 0) return NextResponse.json({ success: true, clientId: activeClientId, cases: [], summary: { healthy: 0, attention: 0 } })

  const [documentsResult, updatesResult, tasksResult, handoffsResult] = await Promise.all([
    client.from('documents').select('id,case_id,client_id,user_id,title,partner,type,document_date,file_name,file_url').in('case_id', ids),
    client.from('mila_case_updates').select('id,case_id,user_id,kind,status').in('case_id', ids),
    client.from('mila_coordination_tasks').select('id,case_id,user_id,status').in('case_id', ids),
    client.from('mila_case_handoffs').select('id,case_id,version').in('case_id', ids),
  ])

  const error = documentsResult.error || updatesResult.error || tasksResult.error || handoffsResult.error
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  const documents = documentsResult.data || []
  const updates = updatesResult.data || []
  const tasks = tasksResult.data || []
  const handoffs = handoffsResult.data || []

  const result = (cases || []).map(item => {
    const caseDocuments = documents.filter(doc => doc.case_id === item.id)
    const caseUpdates = updates.filter(update => update.case_id === item.id)
    const caseTasks = tasks.filter(task => task.case_id === item.id)
    const caseHandoffs = handoffs.filter(handoff => handoff.case_id === item.id)
    const flags: string[] = []

    if (caseDocuments.some(doc => doc.user_id !== user.id || doc.client_id !== item.client_id)) flags.push('child_scope_mismatch')
    if (caseUpdates.some(update => update.user_id !== user.id) || caseTasks.some(task => task.user_id !== user.id)) flags.push('child_owner_mismatch')
    if (item.status === 'done' && caseUpdates.some(update => update.kind === 'question' && update.status !== 'done')) flags.push('done_with_open_question')
    if (item.status === 'done' && caseTasks.some(task => task.status !== 'done')) flags.push('done_with_open_task')
    if (item.status === 'done' && !item.completed_at) flags.push('done_without_completed_at')
    if (item.status === 'done' && !item.handoff_ready) flags.push('done_without_handoff_ready')
    if (item.status === 'done' && caseHandoffs.length === 0) flags.push('legacy_done_without_handoff_snapshot')
    if (item.status !== 'done' && item.completed_at) flags.push('active_with_completed_at')
    if (item.handoff_ready && caseHandoffs.length === 0) flags.push('handoff_ready_without_snapshot')

    return {
      caseId: item.id,
      subject: item.subject,
      status: item.status,
      documentCount: caseDocuments.length,
      openQuestionCount: caseUpdates.filter(update => update.kind === 'question' && update.status !== 'done').length,
      openTaskCount: caseTasks.filter(task => task.status !== 'done').length,
      handoffCount: caseHandoffs.length,
      latestHandoffVersion: caseHandoffs.reduce((max, handoff) => Math.max(max, Number(handoff.version || 0)), 0),
      integrityFlags: flags,
      healthy: flags.length === 0 || (flags.length === 1 && flags[0] === 'legacy_done_without_handoff_snapshot'),
    }
  })

  return NextResponse.json({
    success: true,
    clientId: activeClientId,
    cases: result,
    summary: {
      healthy: result.filter(item => item.healthy).length,
      attention: result.filter(item => !item.healthy).length,
    },
  })
}
