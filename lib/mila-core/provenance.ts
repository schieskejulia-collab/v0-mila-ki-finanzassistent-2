import type { MilaConfidence, MilaEvidenceRef, MilaInterpretation } from "./types"

export type MilaProvenanceSource = "input" | "memory" | "human" | "connector" | "system"

export interface MilaProvenanceRecord {
  field: string
  originalValue: unknown
  value: unknown
  source: MilaProvenanceSource
  sourceLabel: string
  transformation: "none" | "interpreted" | "normalized" | "confirmed" | "overridden"
  confidence: MilaConfidence
  evidence: MilaEvidenceRef[]
  humanConfirmed: boolean
}

export function buildInputProvenance(interpretation: MilaInterpretation): MilaProvenanceRecord[] {
  return Object.entries(interpretation.knownFacts).map(([field, value]) => ({
    field,
    originalValue: value,
    value,
    source: "input" as const,
    sourceLabel: interpretation.source,
    transformation: "interpreted" as const,
    confidence: interpretation.confidence,
    evidence: interpretation.evidence,
    humanConfirmed: false,
  }))
}
