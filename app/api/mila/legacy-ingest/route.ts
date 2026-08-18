import { NextResponse } from "next/server"
import { ingestLegacyContent, type LegacyFormat } from "@/lib/mila-core/legacy-ingestion"

export const runtime = "nodejs"

type LegacyIngestRequest = {
  content?: string
  format?: LegacyFormat
  fileName?: string
}

function inferFormat(fileName = ""): LegacyFormat | undefined {
  const normalized = fileName.toLowerCase()
  if (normalized.endsWith(".csv")) return "csv"
  if (normalized.endsWith(".json")) return "json"
  if (normalized.endsWith(".txt")) return "text"
  return undefined
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LegacyIngestRequest
    const format = body.format ?? inferFormat(body.fileName)

    if (!body.content || typeof body.content !== "string") {
      return NextResponse.json({ success: false, error: "Kein Dateiinhalt erhalten." }, { status: 400 })
    }

    if (!format || !["csv", "json", "text"].includes(format)) {
      return NextResponse.json(
        { success: false, error: "Format nicht erkannt. Unterstützt sind CSV, JSON und Text." },
        { status: 400 },
      )
    }

    const result = ingestLegacyContent({
      content: body.content,
      format,
      sourceLabel: body.fileName || `Legacy-${format.toUpperCase()}-Import`,
    })

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        preview: result.rows.slice(0, 10),
        rows: undefined,
      },
    })
  } catch (error: any) {
    console.error("Mila legacy-ingest error:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Legacy-Daten konnten nicht analysiert werden." },
      { status: 500 },
    )
  }
}
