import { NextResponse } from "next/server"
import { requireSupabaseUser } from "@/lib/supabase-server"
import { buildProcessPlan } from "@/lib/mila-core/process-engine"
import type { MilaInputSource, MilaTargetSystem } from "@/lib/mila-core/types"

interface ProcessRequestBody {
  caseId?: string
  source?: MilaInputSource
  subject?: string
  text?: string
  fileName?: string
  fields?: Record<string, unknown>
  target?: MilaTargetSystem
}

export async function POST(req: Request) {
  try {
    const { client, user, error: authError } = await requireSupabaseUser(req)

    if (authError || !user) {
      return NextResponse.json({ success: false, error: authError }, { status: 401 })
    }

    const body = (await req.json()) as ProcessRequestBody

    if (!body.source) {
      return NextResponse.json(
        { success: false, error: "source fehlt" },
        { status: 400 },
      )
    }

    if (!body.text && !body.subject && !body.fileName && !body.fields) {
      return NextResponse.json(
        { success: false, error: "Kein Inhalt zur Verarbeitung vorhanden" },
        { status: 400 },
      )
    }

    if (body.caseId) {
      const { data: existingCase, error: caseError } = await client
        .from("mila_intake_cases")
        .select("id")
        .eq("id", body.caseId)
        .eq("user_id", user.id)
        .maybeSingle()

      if (caseError) {
        return NextResponse.json({ success: false, error: caseError.message }, { status: 500 })
      }

      if (!existingCase) {
        return NextResponse.json({ success: false, error: "Vorgang nicht gefunden" }, { status: 404 })
      }
    }

    const plan = buildProcessPlan({
      caseId: body.caseId,
      source: body.source,
      subject: body.subject,
      text: body.text,
      fileName: body.fileName,
      fields: body.fields,
      target: body.target,
    })

    if (body.caseId && plan.questions.length > 0) {
      const firstQuestion = plan.questions[0]
      const { error: updateError } = await client.from("mila_case_updates").insert({
        user_id: user.id,
        case_id: body.caseId,
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
        .eq("id", body.caseId)
        .eq("user_id", user.id)
    }

    if (body.caseId && plan.handoffReady) {
      const handoffSummary = JSON.stringify(
        {
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
        .eq("id", body.caseId)
        .eq("user_id", user.id)

      if (caseUpdateError) {
        return NextResponse.json({ success: false, error: caseUpdateError.message }, { status: 500 })
      }

      const { error: handoffLogError } = await client.from("mila_case_updates").insert({
        user_id: user.id,
        case_id: body.caseId,
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
      data: plan,
      next: plan.questions[0]?.question ?? (plan.handoffReady ? "human_review" : "needs_interpretation"),
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Mila Core konnte den Vorgang nicht verarbeiten" },
      { status: 500 },
    )
  }
}
