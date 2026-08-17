import { NextResponse } from "next/server"
import { requireSupabaseUser } from "@/lib/supabase-server"

interface ApprovalRequestBody {
  caseId?: string
  approved?: boolean
  approvedBy?: string
}

export async function POST(req: Request) {
  try {
    const { client, user, error: authError } = await requireSupabaseUser(req)

    if (authError || !user) {
      return NextResponse.json({ success: false, error: authError }, { status: 401 })
    }

    const body = (await req.json()) as ApprovalRequestBody

    if (!body.caseId) {
      return NextResponse.json({ success: false, error: "caseId fehlt" }, { status: 400 })
    }

    if (body.approved !== true) {
      return NextResponse.json(
        { success: false, error: "Explizite menschliche Freigabe erforderlich" },
        { status: 400 },
      )
    }

    const { data: milaCase, error: caseError } = await client
      .from("mila_intake_cases")
      .select("id, handoff_ready, handoff_summary, status")
      .eq("id", body.caseId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (caseError) {
      return NextResponse.json({ success: false, error: caseError.message }, { status: 500 })
    }

    if (!milaCase) {
      return NextResponse.json({ success: false, error: "Vorgang nicht gefunden" }, { status: 404 })
    }

    if (!milaCase.handoff_ready || !milaCase.handoff_summary) {
      return NextResponse.json(
        { success: false, error: "Vorgang ist noch nicht übergabebereit" },
        { status: 409 },
      )
    }

    const approvedBy = body.approvedBy?.trim() || user.email || user.id

    const { error: logError } = await client.from("mila_case_updates").insert({
      user_id: user.id,
      case_id: body.caseId,
      kind: "note",
      content: `Menschliche Freigabe erteilt durch ${approvedBy}.`,
      status: "done",
    })

    if (logError) {
      return NextResponse.json({ success: false, error: logError.message }, { status: 500 })
    }

    const { error: caseUpdateError } = await client
      .from("mila_intake_cases")
      .update({ status: "in_progress" })
      .eq("id", body.caseId)
      .eq("user_id", user.id)

    if (caseUpdateError) {
      return NextResponse.json({ success: false, error: caseUpdateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        caseId: body.caseId,
        approvedBy,
        handoff: milaCase.handoff_summary,
        execution: "not_executed",
        note: "Freigabe erteilt. Externe Connector-Ausführung ist im MVP bewusst noch deaktiviert.",
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Freigabe konnte nicht verarbeitet werden" },
      { status: 500 },
    )
  }
}
