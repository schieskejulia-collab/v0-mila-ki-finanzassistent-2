import { NextResponse } from "next/server"
import { buildDocumentCoreInput, type MilaDocumentScanResult } from "@/lib/mila-core/document-intelligence"
import { buildProcessPlan } from "@/lib/mila-core/process-engine"
import type { MilaMemoryContext, MilaTargetSystem } from "@/lib/mila-core/types"

export const runtime = "nodejs"

type DocumentPlanRequest = {
  scan?: MilaDocumentScanResult
  caseId?: string
  urgent?: boolean
  sensitive?: boolean
  target?: MilaTargetSystem
  memory?: MilaMemoryContext
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as DocumentPlanRequest

    if (!body?.scan || typeof body.scan !== "object") {
      return NextResponse.json(
        { success: false, error: "Kein Scannergebnis erhalten." },
        { status: 400 },
      )
    }

    const coreInput = buildDocumentCoreInput(body.scan, {
      source: "upload",
      caseId: body.caseId,
    })

    const plan = buildProcessPlan({
      ...coreInput,
      urgent: Boolean(body.urgent),
      sensitive: Boolean(body.sensitive),
      target: body.target,
      memory: body.memory,
    })

    return NextResponse.json({
      success: true,
      data: {
        scannerConfidence: coreInput.scannerConfidence,
        scannerEvidence: coreInput.scannerEvidence,
        normalizedInput: {
          subject: coreInput.subject,
          text: coreInput.text,
          fileName: coreInput.fileName,
          fields: coreInput.fields,
        },
        plan,
      },
    })
  } catch (error: any) {
    console.error("Mila document-plan error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Dokument konnte nicht an Mila Core übergeben werden.",
      },
      { status: 500 },
    )
  }
}
