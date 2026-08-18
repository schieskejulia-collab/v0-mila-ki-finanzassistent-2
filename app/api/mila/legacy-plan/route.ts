import { NextResponse } from "next/server"
import { buildLegacyBridge, type LegacyMappingOverride } from "@/lib/mila-core/legacy-bridge"
import { buildProcessPlan } from "@/lib/mila-core/process-engine"
import type { LegacyFormat } from "@/lib/mila-core/legacy-ingestion"
import type { MilaTargetSystem } from "@/lib/mila-core/types"

export const runtime = "nodejs"

type LegacyPlanRequest = {
  content?: string
  format?: LegacyFormat
  fileName?: string
  mappings?: LegacyMappingOverride[]
  target?: MilaTargetSystem
  urgent?: boolean
  sensitive?: boolean
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LegacyPlanRequest
    if (!body.content || !body.format) {
      return NextResponse.json({ success: false, error: "Inhalt und Format sind erforderlich." }, { status: 400 })
    }

    const bridge = buildLegacyBridge({
      content: body.content,
      format: body.format,
      fileName: body.fileName,
      mappings: body.mappings,
    })

    const plan = buildProcessPlan({
      caseId: `legacy-${Date.now()}`,
      source: "upload",
      fileName: body.fileName || `legacy.${body.format}`,
      subject: `Legacy-Import ${body.fileName || body.format.toUpperCase()}`,
      fields: bridge.fields,
      sourceProvenance: bridge.provenance,
      target: body.target,
      urgent: body.urgent,
      sensitive: body.sensitive,
    })

    return NextResponse.json({
      success: true,
      data: {
        schema: bridge.ingestion.schema,
        preview: bridge.mappedRows.slice(0, 5),
        mappingConfirmed: bridge.mappingConfirmed,
        unresolvedColumns: bridge.unresolvedColumns,
        plan,
      },
    })
  } catch (error: any) {
    console.error("Mila legacy-plan error:", error)
    return NextResponse.json({ success: false, error: error?.message || "Legacy-Plan konnte nicht erzeugt werden." }, { status: 500 })
  }
}
