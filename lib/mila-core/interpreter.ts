import type { MilaInputSource, MilaInterpretation } from "./types"

export interface MilaInterpretInput {
  source: MilaInputSource
  caseId?: string
  subject?: string
  text?: string
  fileName?: string
  fields?: Record<string, unknown>
}

const includesAny = (value: string, terms: string[]) => terms.some((term) => value.includes(term))

export function interpretInput(input: MilaInterpretInput): MilaInterpretation {
  const text = [input.subject, input.text, input.fileName, JSON.stringify(input.fields ?? {})]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  let detectedType = input.fileName ? "document" : "message"
  let processType: string | undefined
  const knownFacts: Record<string, unknown> = { ...(input.fields ?? {}) }
  const missingContext: string[] = []
  const ambiguities: string[] = []

  if (includesAny(text, ["rechnung", "invoice", "beleg"])) {
    detectedType = "accounting_document"
    processType = "document_handoff"
    if (!knownFacts.businessPurpose) missingContext.push("businessPurpose")
  } else if (includesAny(text, ["termin", "appointment", "meeting"])) {
    detectedType = "appointment_request"
    processType = "coordination"
    if (!knownFacts.requestedTime) missingContext.push("requestedTime")
  } else if (includesAny(text, ["kunde", "mandant", "client", "anfrage"])) {
    detectedType = "client_request"
    processType = "case_intake"
  } else {
    ambiguities.push("processType")
  }

  const confidence = processType ? (missingContext.length ? "medium" : "high") : "low"

  return {
    source: input.source,
    caseId: input.caseId,
    detectedType,
    processType,
    confidence,
    summary: input.subject || input.text?.slice(0, 240) || input.fileName || "Neuer Vorgang",
    knownFacts,
    missingContext,
    ambiguities,
    evidence: [],
  }
}
