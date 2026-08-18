import { NextResponse } from "next/server"
import { requireSupabaseUser } from "@/lib/supabase-server"
import { buildProcessPlan } from "@/lib/mila-core/process-engine"
import { loadPersistentMilaMemory } from "@/lib/mila-core/persistent-memory"
import type { MilaInputSource, MilaTargetSystem } from "@/lib/mila-core/types"

interface ProcessRequestBody {
  caseId?: string
  clientId?: string
  source?: MilaInputSource
  subject?: string
  text?: string
  fileName?: string
  fields?: Record<string, unknown>
  target?: MilaTargetSystem
}

const DB_SOURCES = new Set(["phone", "email", "upload", "form", "manual"])

export async function POST(req: Request) {
  try {
    const { client, user, error: authError } = await requireSupabaseUser(req)

    if (authError || !user) {
      return NextResponse.json({ success: false, error: authError }, { status: 401 })
    }

    const body = (await req.json()) as ProcessRequestBody

    if (!body.source) {
      return NextResponse.json({ success: false, error: "source fehlt" }, { status: 400 })
    }

    if (!body.text && !body.subject && !body.fileName && !body.fields) {
      return NextResponse.json(
        { success: false, error: "Kein Inhalt zur Verarbeitung vorhanden" },
        { status: 400 },
      )
    }

    let caseId = body.caseId

    if (caseId) {
      const { data: existingCase, error: caseError } = await client
        .from("mila_intake_cases")
        .select("id")
        .eq("id", caseId)
        .eq("user_id", user.id)
        .maybeSingle()

      if (caseError) {
        return NextResponse.json({ success: false, error: caseError.message }, { status: 500 })
      }

      if (!existingCase) {
        return NextResponse.json({ success: false, error: "Vorgang nicht gefunden" }, { status: 404 })
      }
    } else {
      const storedSource = DB_SOURCES.has(body.source) ? body.source : "manual"
      const subject =
        body.subject?.trim() ||
        body.fileName?.trim() ||
        body.text?.trim().slice(0, 120) ||
        "Mila Core Vorgang"
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
          requires_human: true,
        })
        .select("id")
        .single()

      if (createError || !createdCase) {
        return NextResponse.json(
          { success: false, error: createError?.message || "Vorgang konnte nicht angelegt werden" },
          { status: 500 },
        )
      }

      caseId = createdCase.id
    }

    const memory = body.clientId
      ? await loadPersistentMilaMemory({
          client,
          userId: user.id,
          clientId: body.clientId,
        })
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
    })

    if (plan.questions.length > 0) {
      const firstQuestion = plan.questions[0]
      const { error: updateError } = await client.from("mila_case_updates").insert({
        user_id: user.id,
        case_id: caseId,
        kind: "question",
        content: firstQuestion.question,
        status: "waiting",
      })

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
      }

      await client
        .from("mila_intake_cases")
        .update({ status: "needs_info", handoff_ready: false })
        .eq("id", caseId)
        .eq("user_id", user.id)
    }

    if (plan.handoffReady) {
      const handoffSummary = JSON.stringify(
        {
          clientId: body.clientId || null,
          processType: plan.interpretation.processType,
          summary: plan.interpretation.summary,
          facts: plan.interpretation.knownFacts,
          target: body.target ?? null,
        },
        null,
        2,
      )

      const { error: caseUpdateError } = await client
        .from("mila_intake_cases")
        .update({
          status: "human_review",
          handoff_ready: true,
          handoff_summary: handoffSummary,
        })
        .eq("id", caseId)
        .eq("user_id", user.id)

      if (caseUpdateError) {
        return NextResponse.json({ success: false, error: caseUpdateError.message }, { status: 500 })
      }

      const { error: handoffLogError } = await client.from("mila_case_updates").insert({
        user_id: user.id,
        case_id: caseId,
        kind: "handoff",
        content: handoffSummary,
        status: "open",
      })

      if (handoffLogError) {
        return NextResponse.json({ success: false, error: handoffLogError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      caseId,
      data: plan,
      memory: memory
        ? {
            client: memory.client,
            projects: memory.projects.length,
            vehicles: memory.vehicles.length,
            contacts: memory.contacts.length,
            confirmedPatterns: memory.confirmedPatterns.length,
          }
        : null,
      next:
        plan.questions[0]?.question ??
        (plan.handoffReady ? "human_review" : "needs_interpretation"),
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Mila Core konnte den Vorgang nicht verarbeiten" },
      { status: 500 },
    )
  }
}
