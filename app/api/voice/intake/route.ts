import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

type Urgency = 'low' | 'normal' | 'high' | 'critical'

type VoiceIntakePayload = {
  call_id?: string
  provider?: string
  caller_name?: string
  company?: string
  phone?: string
  email?: string
  subject?: string
  summary?: string
  urgency?: Urgency
  category?: string
  sensitive?: boolean
  resolved_during_call?: boolean
  needs_follow_up?: boolean
}

const allowedUrgencies = new Set<Urgency>(['low', 'normal', 'high', 'critical'])
const sensitivePattern = /(finanzamt|mahnung|frist|bescheid|kündigung|klage|datenschutz|beschwerde|steuer|prüfung|anwalt|gericht)/i

function safeText(value: unknown, max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function isAuthorized(request: Request, secret: string) {
  const auth = request.headers.get('authorization') || ''
  const expected = `Bearer ${secret}`
  const actualBuffer = Buffer.from(auth)
  const expectedBuffer = Buffer.from(expected)
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: 'mila-voice-intake',
    configured: Boolean(
      process.env.MILA_VOICE_WEBHOOK_SECRET?.trim() &&
      process.env.MILA_VOICE_OWNER_USER_ID?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    ),
  })
}

export async function POST(request: Request) {
  const secret = process.env.MILA_VOICE_WEBHOOK_SECRET?.trim()
  const ownerUserId = process.env.MILA_VOICE_OWNER_USER_ID?.trim()

  if (!secret || !ownerUserId) {
    return NextResponse.json({ error: 'Mila Voice ist serverseitig noch nicht konfiguriert.' }, { status: 503 })
  }
  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  }

  let body: VoiceIntakePayload
  try {
    body = (await request.json()) as VoiceIntakePayload
  } catch {
    return NextResponse.json({ error: 'Ungültiges JSON.' }, { status: 400 })
  }

  const callId = safeText(body.call_id, 200)
  const summary = safeText(body.summary, 8000)
  const provider = safeText(body.provider, 80) || 'voice-provider'
  const callerName = safeText(body.caller_name, 200)
  const company = safeText(body.company, 200)
  const phone = safeText(body.phone, 100)
  const email = safeText(body.email, 320)
  const subject = safeText(body.subject, 300) || `Telefonanfrage${callerName ? ` von ${callerName}` : ''}`
  const category = safeText(body.category, 120) || 'Telefon / Rückruf'
  const urgency: Urgency = allowedUrgencies.has(body.urgency as Urgency) ? (body.urgency as Urgency) : 'normal'

  if (!callId || !summary) {
    return NextResponse.json({ error: 'call_id und summary sind erforderlich.' }, { status: 400 })
  }

  const sourceReference = `voice:${provider}:${callId}`
  const sensitive = Boolean(body.sensitive) || sensitivePattern.test(`${subject} ${summary}`)
  const resolvedDuringCall = body.resolved_during_call === true
  const explicitFollowUp = body.needs_follow_up === true
  const missingContact = !phone && !email
  const urgent = urgency === 'high' || urgency === 'critical'
  const requiresHuman = sensitive || urgent || missingContact || explicitFollowUp || !resolvedDuringCall
  const status = missingContact ? 'needs_info' : requiresHuman ? 'human_review' : resolvedDuringCall ? 'done' : 'standard'

  const supabase = getSupabaseAdmin()
  const { data: existing, error: existingError } = await supabase
    .from('mila_intake_cases')
    .select('id,status')
    .eq('user_id', ownerUserId)
    .eq('source_reference', sourceReference)
    .maybeSingle()

  if (existingError) {
    console.error('Mila voice idempotency lookup failed', existingError)
    return NextResponse.json({ error: 'Eingang konnte nicht geprüft werden.' }, { status: 500 })
  }
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true, case_id: existing.id, status: existing.status })
  }

  const { data: createdCase, error: caseError } = await supabase
    .from('mila_intake_cases')
    .insert({
      user_id: ownerUserId,
      source: 'phone',
      caller_name: callerName || null,
      company: company || null,
      phone: phone || null,
      email: email || null,
      subject,
      summary,
      urgency,
      category,
      status,
      requires_human: requiresHuman,
      sensitive,
      source_reference: sourceReference,
    })
    .select('id,status')
    .single()

  if (caseError || !createdCase) {
    console.error('Mila voice intake insert failed', caseError)
    return NextResponse.json({ error: 'Telefonvorgang konnte nicht gespeichert werden.' }, { status: 500 })
  }

  let taskId: string | null = null
  if (requiresHuman || explicitFollowUp) {
    const nextAction = sensitive
      ? 'Sensible oder fachliche Anfrage menschlich prüfen und Rückmeldung organisieren'
      : urgent
        ? 'Dringenden Rückruf oder nächsten Schritt organisieren'
        : 'Rückruf oder nächsten Schritt organisieren und Vorgang bis Abschluss nachhalten'

    const { data: task, error: taskError } = await supabase
      .from('mila_coordination_tasks')
      .insert({
        user_id: ownerUserId,
        case_id: createdCase.id,
        title: `Telefon nachfassen: ${subject}`,
        contact_name: callerName || company || null,
        contact_channel: phone || email || null,
        goal: summary,
        status: 'open',
        next_action: nextAction,
      })
      .select('id')
      .single()

    if (taskError) console.error('Mila voice follow-up task insert failed', taskError)
    else taskId = task?.id || null
  }

  return NextResponse.json({
    ok: true,
    case_id: createdCase.id,
    task_id: taskId,
    status: createdCase.status,
    requires_human: requiresHuman,
    sensitive,
  }, { status: 201 })
}
