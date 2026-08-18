import type { MilaInterpretation, MilaProvenanceRecord } from "./types"

export function buildInputProvenance(interpretation: MilaInterpretation): MilaProvenanceRecord[] {
  return Object.entries(interpretation.knownFacts).map(([field, value]) => ({
    field,
    originalValue: value,
    value,
    source: "input",
    sourceLabel: interpretation.source,
    transformation: "interpreted",
    confidence: interpretation.confidence,
    evidence: interpretation.evidence,
    humanConfirmed: false,
  }))
}
