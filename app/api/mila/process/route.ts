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
const URGENCIES = new Set(["low", "normal", "high", "critical"])

function textField(fields: Record<string, unknown> | undefined, key: string) {
  const value = fields?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function boolField(fields: Record<string, unknown> | undefined, key: string) {
  return fields?.[key] === true
}

async function insertUpdateOnce({
  client,
  userId,
  caseId,
  kind,
  content,
  status,
}: {
  client: any
  userId: string
  caseId: string
  kind: "question" | "answer" | "note" | "handoff"
  content: string
  status: "open" | "waiting" | "done"
}) {
  const { data: existing } = await client
    .from("mila_case_updates")
    .select("id")
    .eq("user_id", userId)
    .eq("case_id", caseId)
    .eq("kind", kind)
    .eq("content", content)
    .limit(1)
    .maybeSingle()

  if (existing) return

  const { error } = await client.from("mila_case_updates").insert({
    user_id: userId,
    case_id: caseId,
    kind,
    content,
    status,
  })

  if (error) throw error
}

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

    const fields = body.fields || {}
    const callerName = textField(fields, "caller_name")
    const company = textField(fields, "company")
    const phone = textField(fields, "phone")
    const email = textField(fields, "email")
    const assignedTo = textField(fields, "assigned_to")
    const category = textField(fields, "category")
    const nextAction = textField(fields, "next_action")
    const dueAt = textField(fields, "due_at")
    const requestedUrgency = textField(fields, "urgency") || "normal"
    const urgency = URGENCIES.has(requestedUrgency) ? requestedUrgency : "normal"
    const sensitive = boolField(fields, "sensitive")
    const explicitlyHuman = boolField(fields, "requires_human")
    const requiresHuman = explicitlyHuman || sensitive || urgency === "high" || urgency === "critical"

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
        "Neuer Mila Vorgang"
      const summary = body.text?.trim() || body.subject?.trim() || body.fileName?.trim() || ""

      const { data: createdCase, error: createError } = await client
        .from("mila_intake_cases")
        .insert({
          user_id: user.id,
          client_id: body.clientId || null,
          source: storedSource,
          caller_name: callerName,
          company,
          phone,
          email,
          subject,
          summary,
          urgency,
          category: category || "mila_core",
          status: requiresHuman ? "human_review" : "new",
          assigned_to: assignedTo,
          due_at: dueAt,
          requires_human: requiresHuman,
          sensitive,
          handoff_ready: false,
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
      fields,
      memory,
      target: body.target,
    })

    const baseCaseUpdate: Record<string, unknown> = {
      caller_name: callerName,
      company,
      phone,
      email,
      assigned_to: assignedTo,
      due_at: dueAt,
      urgency,
      sensitive,
      requires_human: requiresHuman || plan.interpretation.confidence === "low",
    }

    if (category) baseCaseUpdate.category = category

    if (plan.questions.length > 0) {
      const firstQuestion = plan.questions[0]

      await insertUpdateOnce({
        client,
        userId: user.id,
        caseId,
        kind: "question",
        content: firstQuestion.question,
        status: "waiting",
      })

      Object.assign(baseCaseUpdate, {
        status: "needs_info",
        handoff_ready: false,
      })
    } else if (plan.handoffReady) {
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

      Object.assign(baseCaseUpdate, {
        status: "human_review",
        handoff_ready: true,
        handoff_summary: handoffSummary,
        requires_human: true,
      })

      await insertUpdateOnce({
        client,
        userId: user.id,
        caseId,
        kind: "handoff",
        content: handoffSummary,
        status: "open",
      })
    } else {
      Object.assign(baseCaseUpdate, {
        status: requiresHuman ? "human_review" : "in_progress",
        handoff_ready: false,
      })
    }

    const { error: caseUpdateError } = await client
      .from("mila_intake_cases")
      .update(baseCaseUpdate)
      .eq("id", caseId)
      .eq("user_id", user.id)

    if (caseUpdateError) {
      return NextResponse.json({ success: false, error: caseUpdateError.message }, { status: 500 })
    }

    const { data: existingTask } = await client
      .from("mila_coordination_tasks")
      .select("id")
      .eq("user_id", user.id)
      .eq("case_id", caseId)
      .neq("status", "done")
      .limit(1)
      .maybeSingle()

    if (!existingTask) {
      const next =
        nextAction ||
        plan.questions[0]?.question ||
        (plan.handoffReady
          ? "Vorgang fachlich prüfen und übernehmen"
          : "Vorgang prüfen und nächsten Schritt festlegen")

      const { error: taskError } = await client.from("mila_coordination_tasks").insert({
        user_id: user.id,
        case_id: caseId,
        title: body.subject?.trim() || body.fileName?.trim() || "Vorgang übernehmen",
        contact_name: callerName || company,
        contact_channel: phone || email,
        goal: plan.interpretation.summary || body.text || body.subject || "Vorgang sauber weiterführen",
        status: plan.questions.length > 0 ? "waiting" : "open",
        due_at: dueAt,
        next_action: next,
      })

      if (taskError) {
        return NextResponse.json({ success: false, error: taskError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      caseId,
      data: plan,
      workspace: {
        status:
          plan.questions.length > 0
            ? "needs_info"
            : plan.handoffReady
              ? "human_review"
              : requiresHuman
                ? "human_review"
                : "in_progress",
        question: plan.questions[0]?.question || null,
        handoffReady: plan.handoffReady,
        nextAction:
          nextAction ||
          plan.questions[0]?.question ||
          (plan.handoffReady ? "Fachliche Prüfung" : "Nächsten Schritt festlegen"),
      },
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
