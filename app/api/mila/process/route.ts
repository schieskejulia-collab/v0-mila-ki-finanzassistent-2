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

function cookieValue(req: Request, key: string) {
  const raw = req.headers.get("cookie") || ""
  const match = raw
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${key}=`))

  if (!match) return null

  try {
    return decodeURIComponent(match.slice(key.length + 1)) || null
  } catch {
    return match.slice(key.length + 1) || null
  }
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
    const activeClientId = body.clientId || cookieValue(req, "mila_active_client") || undefined
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

    if (!activeClientId) {
      return NextResponse.json({ success: false, error: "Bitte zuerst eine aktive Akte auswählen" }, { status: 409 })
    }

    const { data: activeClient, error: activeClientError } = await client
      .from("clients")
      .select("id")
      .eq("id", activeClientId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (activeClientError || !activeClient) {
      return NextResponse.json({ success: false, error: "Aktive Akte wurde nicht gefunden" }, { status: 404 })
    }

    let caseId: string = body.caseId || ""

    if (caseId) {
      const { data: existingCase, error: caseError } = await client
        .from("mila_intake_cases")
        .select("id,client_id")
        .eq("id", caseId)
        .eq("user_id", user.id)
        .maybeSingle()

      if (caseError) {
        return NextResponse.json({ success: false, error: caseError.message }, { status: 500 })
      }

      if (!existingCase) {
        return NextResponse.json({ success: false, error: "Vorgang nicht gefunden" }, { status: 404 })
      }

      if (existingCase.client_id !== activeClientId) {
        return NextResponse.json({ success: false, error: "Vorgang gehört nicht zur aktiven Akte" }, { status: 409 })
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
          client_id: activeClientId,
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

    const memory = await loadPersistentMilaMemory({
      client,
      userId: user.id,
      clientId: activeClientId,
    })

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
      client_id: activeClientId,
      caller_name: callerName,
      company,
      phone,
      email,
      assigned_to: assignedTo,
      due_at: dueAt,
      urgency,
      sensitive,
      requires_human: requiresHuman || plan.interpretation.confidence === "low",
      handoff_ready: false,
      handoff_summary: null,
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
      })
    } else {
      Object.assign(baseCaseUpdate, {
        status: requiresHuman ? "human_review" : "in_progress",
      })
    }

    const { error: caseUpdateError } = await client
      .from("mila_intake_cases")
      .update(baseCaseUpdate)
      .eq("id", caseId)
      .eq("user_id", user.id)
      .eq("client_id", activeClientId)

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
          ? "Organisatorische Vollständigkeit im Vorgang prüfen"
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
      clientId: activeClientId,
      data: plan,
      workspace: {
        status:
          plan.questions.length > 0
            ? "needs_info"
            : requiresHuman
              ? "human_review"
              : "in_progress",
        question: plan.questions[0]?.question || null,
        handoffReady: false,
        interpretationReady: plan.handoffReady,
        nextAction:
          nextAction ||
          plan.questions[0]?.question ||
          (plan.handoffReady ? "Organisatorische Vollständigkeit prüfen" : "Nächsten Schritt festlegen"),
      },
      memory: {
        client: memory.client,
        projects: memory.projects.length,
        vehicles: memory.vehicles.length,
        contacts: memory.contacts.length,
        confirmedPatterns: memory.confirmedPatterns.length,
      },
      next:
        plan.questions[0]?.question ??
        (plan.handoffReady ? "check_readiness" : "needs_interpretation"),
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Mila Core konnte den Vorgang nicht verarbeiten" },
      { status: 500 },
    )
  }
}
