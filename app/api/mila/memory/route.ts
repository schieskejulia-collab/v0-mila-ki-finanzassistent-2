import { NextResponse } from "next/server"
import { requireSupabaseUser } from "@/lib/supabase-server"
import {
  loadPersistentMilaMemory,
  savePersistentMilaPattern,
} from "@/lib/mila-core/persistent-memory"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(req: Request) {
  try {
    const { client, user, error: authError } = await requireSupabaseUser(req)
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: authError }, { status: 401 })
    }

    const url = new URL(req.url)
    const clientId = url.searchParams.get("clientId") || ""
    if (!clientId) {
      return NextResponse.json({ ok: false, error: "clientId fehlt" }, { status: 400 })
    }

    const memory = await loadPersistentMilaMemory({
      client,
      userId: user.id,
      clientId,
    })

    if (!memory) {
      return NextResponse.json({ ok: false, error: "Mandant nicht gefunden" }, { status: 404 })
    }

    return NextResponse.json({ ok: true, memory })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Mila Memory konnte nicht geladen werden" },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const { client, user, error: authError } = await requireSupabaseUser(req)
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: authError }, { status: 401 })
    }

    const body = await req.json()
    const clientId = String(body?.clientId || "")
    const field = String(body?.field || "")
    const label = String(body?.label || "")
    const value = String(body?.value || "")

    if (!clientId || !field || !label || !value) {
      return NextResponse.json(
        { ok: false, error: "clientId, field, label und value sind erforderlich" },
        { status: 400 },
      )
    }

    await savePersistentMilaPattern({
      client,
      userId: user.id,
      clientId,
      field,
      label,
      value,
      confidence: body?.confidence,
      evidenceLabels: Array.isArray(body?.evidenceLabels) ? body.evidenceLabels.map(String) : [],
    })

    const memory = await loadPersistentMilaMemory({
      client,
      userId: user.id,
      clientId,
    })

    return NextResponse.json({ ok: true, memory })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Mila Memory konnte nicht gespeichert werden" },
      { status: 500 },
    )
  }
}
