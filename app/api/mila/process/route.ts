import { NextResponse } from "next/server"
import { requireSupabaseUser } from "@/lib/supabase-server"
import { buildProcessPlan } from "@/lib/mila-core/process-engine"
import { loadPersistentMilaMemory } from "@/lib/mila-core/persistent-memory"
import type { MilaInputSource, MilaProcessState, MilaTargetSystem } from "@/lib/mila-core/types"

interface ProcessRequestBody {
  caseId?: string
  clientId?: string
  source?: MilaInputSource
  subject?: string
  text?: string
  fileName?: string
  fields?: Record<string, unknown>
  target?: MilaTargetSystem
  urgent?: boolean
  sensitive?: boolean
}

const DB_SOURCES = new Set(["phone", "email", "upload", "form", "manual"])

function mapProcessStateToCaseStatus(state: MilaProcessState) {
  switch (state) {
    case "needs_context": return "needs_info"
    case "needs_human_review":
    case "awaiting_approval": return "human_review"
    case "ready": return "standard"
    case "completed": return "done"
    default: return "new"
  }
}

export async function POST(req: Request) {
  try {
    const { client, user, error: authError } = await requireSupabaseUser(req)
    if (authError || !user) return NextResponse.json({ success: false, error: authError }, { status: 401 })

    const body = (await req.json()) as ProcessRequestBody
    if (!body.source) return NextResponse.json({ success: false, error: "source fehlt" }, { status: 400 })
    if (!body.text && !body.subject && !body.fileName && !body.fields) {
      return NextResponse.json({ success: false, error: "Kein Inhalt zur Verarbeitung vorhanden" }, { status: 400 })
    }

    let caseId = body.caseId
    let caseUrgent = body.urgent ?? false
    let caseSensitive = body.sensitive ?? false

    if (caseId) {
      const { data: existingCase, error: caseError } = await client
        .from("mila_intake_cases")
        .select("id, urgency, sensitive")
        .eq("id", caseId)
        .eq("user_id", user.id)
        .maybeSingle()

      if (caseError) return NextResponse.json({ success: false, error: caseError.message }, { status: 500 })
      if (!existingCase) return NextResponse.json({ success: false, error: "Vorgang nicht gefunden" }, { status: 404 })

      caseUrgent = body.urgent ?? existingCase.urgency === "urgent"
      caseSensitive = body.sensitive ?? Boolean(existingCase.sensitive)
    } else {
      const storedSource = DB_SOURCES.has(body.source) ? body.source : "manual"
      const subject = body.subject?.trim() || body.fileName?.trim() || body.text?.trim().slice(0, 120) || "Mila Core Vorgang"
      const summary = body.text?.trim() || body.subject?.trim() || body.fileName?.trim() || ""

      const { data: createdCase, error: createError } = await client
        .from("mila_intake_cases")
        .insert({
          user_id: user.id,
          client_id: body.clientId || null,
          source: storedSource,
          subject,
          summary,
          status: "new",
          category: "mila_core",
          urgency: caseUrgent ? "urgent" : "normal",
          sensitive: caseSensitive,
          requires_human: caseSensitive,
        })
        .select("id")
        .single()

      if (createError || !createdCase) {
        return NextResponse.json({ success: false, error: createError?.message || "Vorgang konnte nicht angelegt werden" }, { status: 500 })
      }
      caseId = createdCase.id
    }

    const memory = body.clientId
      ? await loadPersistentMilaMemory({ client, userId: user.id, clientId: body.clientId })
      : undefined

    const plan = buildProcessPlan({
      caseId,
      source: body.source,
      subject: body.subject,
      text: body.text,
      fileName: body.fileName,
      fields: body.fields,
      memory,
      target: body.target,
      urgent: caseUrgent,
      sensitive: caseSensitive,
    })

    const caseStatus = mapProcessStateToCaseStatus(plan.decision.state)
    const decisionAudit = JSON.stringify({
      event: "orchestration_decision",
      state: plan.decision.state,
      nextStep: plan.decision.nextStep,
      priority: plan.decision.priority,
      reason: plan.decision.reason,
      escalation: plan.decision.escalation,
      urgent: caseUrgent,
      sensitive: caseSensitive,
      confidence: plan.interpretation.confidence,
      detectedType: plan.interpretation.detectedType,
      processType: plan.interpretation.processType ?? null,
      provenance: plan.provenance,
    })

    const { error: decisionLogError } = await client.from("mila_case_updates").insert({
      user_id: user.id, case_id: caseId, kind: "note", content: decisionAudit,
      status: plan.decision.state === "completed" ? "done" : "open",
    })
    if (decisionLogError) return NextResponse.json({ success: false, error: decisionLogError.message }, { status: 500 })

    if (plan.decision.escalation.required) {
      const escalationAudit = JSON.stringify({
        event: "orchestration_escalation",
        reason: plan.decision.escalation.reason,
        message: plan.decision.escalation.message,
        fallback: plan.decision.escalation.fallback,
        priority: plan.decision.priority,
      })
      const { error: escalationLogError } = await client.from("mila_case_updates").insert({
        user_id: user.id, case_id: caseId, kind: "note", content: escalationAudit, status: "open",
      })
      if (escalationLogError) return NextResponse.json({ success: false, error: escalationLogError.message }, { status: 500 })
    }

    const { error: statusUpdateError } = await client
      .from("mila_intake_cases")
      .update({
        status: caseStatus,
        handoff_ready: plan.handoffReady,
        requires_human: plan.decision.state === "needs_human_review" || plan.decision.state === "awaiting_approval",
      })
      .eq("id", caseId).eq("user_id", user.id)
    if (statusUpdateError) return NextResponse.json({ success: false, error: statusUpdateError.message }, { status: 500 })

    if (plan.questions.length > 0) {
      const firstQuestion = plan.questions[0]
      const { error: questionLogError } = await client.from("mila_case_updates").insert({
        user_id: user.id, case_id: caseId, kind: "question", content: firstQuestion.question, status: "waiting",
      })
      if (questionLogError) return NextResponse.json({ success: false, error: questionLogError.message }, { status: 500 })
    }

    if (plan.handoffReady) {
      const handoffSummary = JSON.stringify({
        clientId: body.clientId || null,
        processType: plan.interpretation.processType,
        summary: plan.interpretation.summary,
        facts: plan.interpretation.knownFacts,
        provenance: plan.provenance,
        decision: plan.decision,
        target: plan.actions[0]?.target ?? body.target ?? null,
      }, null, 2)

      const { error: caseUpdateError } = await client.from("mila_intake_cases")
        .update({ handoff_summary: handoffSummary }).eq("id", caseId).eq("user_id", user.id)
      if (caseUpdateError) return NextResponse.json({ success: false, error: caseUpdateError.message }, { status: 500 })

      const { error: handoffLogError } = await client.from("mila_case_updates").insert({
        user_id: user.id, case_id: caseId, kind: "handoff", content: handoffSummary, status: "open",
      })
      if (handoffLogError) return NextResponse.json({ success: false, error: handoffLogError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true, caseId, data: plan,
      memory: memory ? {
        client: memory.client, projects: memory.projects.length, vehicles: memory.vehicles.length,
        contacts: memory.contacts.length, confirmedPatterns: memory.confirmedPatterns.length,
      } : null,
      next: plan.questions[0]?.question ?? plan.decision.nextStep,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Mila Core konnte den Vorgang nicht verarbeiten" }, { status: 500 })
  }
}
