import { ingestLegacyContent, type LegacyFormat, type LegacyIngestionResult } from "./legacy-ingestion"
import type { MilaConfidence, MilaProvenanceRecord } from "./types"

export interface LegacyMappingOverride {
  sourceColumn: string
  targetField?: string
  confirmed: boolean
}

export interface LegacyBridgeResult {
  ingestion: LegacyIngestionResult
  mappedRows: Record<string, unknown>[]
  mappingConfirmed: boolean
  unresolvedColumns: string[]
  provenance: MilaProvenanceRecord[]
  fields: Record<string, unknown>
}

function confidenceFor(confirmed: boolean, inferred: MilaConfidence): MilaConfidence {
  return confirmed ? "high" : inferred
}

export function buildLegacyBridge(input: {
  content: string
  format: LegacyFormat
  fileName?: string
  mappings?: LegacyMappingOverride[]
}): LegacyBridgeResult {
  const ingestion = ingestLegacyContent({
    content: input.content,
    format: input.format,
    sourceLabel: input.fileName || `Legacy-${input.format.toUpperCase()}-Import`,
  })

  const overrides = new Map((input.mappings ?? []).map((item) => [item.sourceColumn, item]))
  const effectiveSchema = ingestion.schema.map((column) => {
    const override = overrides.get(column.sourceColumn)
    return {
      ...column,
      targetField: override ? override.targetField : column.targetField,
      confirmed: override?.confirmed === true,
    }
  })

  const unresolvedColumns = effectiveSchema
    .filter((column) => !column.targetField || (!column.confirmed && column.confidence !== "high"))
    .map((column) => column.sourceColumn)

  const mappedRows = ingestion.rows.map((row) => {
    const mapped: Record<string, unknown> = {}
    for (const column of effectiveSchema) {
      if (!column.targetField) continue
      mapped[column.targetField] = row[column.sourceColumn]
    }
    return mapped
  })

  const provenance: MilaProvenanceRecord[] = effectiveSchema
    .filter((column) => column.targetField)
    .map((column) => ({
      field: column.targetField!,
      originalValue: column.sourceColumn,
      value: column.sourceColumn,
      source: "input",
      sourceLabel: input.fileName || `Legacy-${input.format.toUpperCase()}-Import`,
      transformation: column.confirmed ? "confirmed" : "interpreted",
      confidence: confidenceFor(column.confirmed, column.confidence),
      evidence: [{ type: "external", label: `Quellspalte: ${column.sourceColumn}` }],
      humanConfirmed: column.confirmed,
    }))

  const mappingConfirmed = unresolvedColumns.length === 0

  return {
    ingestion: { ...ingestion, schema: effectiveSchema },
    mappedRows,
    mappingConfirmed,
    unresolvedColumns,
    provenance,
    fields: {
      legacyDataset: true,
      legacyFormat: input.format,
      rowCount: ingestion.rowCount,
      sourceColumns: ingestion.columns,
      mappedColumns: effectiveSchema.filter((column) => column.targetField).map((column) => ({
        sourceColumn: column.sourceColumn,
        targetField: column.targetField,
        confidence: confidenceFor(column.confirmed, column.confidence),
        humanConfirmed: column.confirmed,
      })),
      mappingConfirmed,
      unresolvedColumns,
      previewRows: mappedRows.slice(0, 5),
    },
  }
}
