import { NextResponse } from 'next/server'
import {
  sortDocumentBatch,
  type MilaBatchContext,
  type MilaBatchScan,
} from '@/lib/mila-core/batch-sorter'

export const runtime = 'nodejs'

type BatchPlanRequest = {
  scans?: MilaBatchScan[]
  context?: MilaBatchContext
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BatchPlanRequest
    const scans = body?.scans

    if (!Array.isArray(scans) || scans.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Keine Dokumente für die Stapelverarbeitung erhalten.' },
        { status: 400 },
      )
    }

    if (scans.length > 50) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bitte höchstens 50 Dokumente pro Stapel verarbeiten.',
        },
        { status: 413 },
      )
    }

    const invalidIndex = scans.findIndex((scan) => !scan || typeof scan !== 'object')
    if (invalidIndex >= 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Dokument ${invalidIndex + 1} enthält kein gültiges Scannergebnis.`,
        },
        { status: 400 },
      )
    }

    const data = sortDocumentBatch(scans, body.context || {})

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error('Mila batch-plan error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Der Dokumentstapel konnte nicht vorsortiert werden.',
      },
      { status: 500 },
    )
  }
}
