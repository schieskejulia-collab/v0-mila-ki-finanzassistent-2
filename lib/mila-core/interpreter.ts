import type { MilaEvidenceRef, MilaInputSource, MilaInterpretation } from "./types"

export interface MilaInterpretInput {
  source: MilaInputSource
  caseId?: string
  subject?: string
  text?: string
  fileName?: string
  fields?: Record<string, unknown>
}

const includesAny = (value: string, terms: string[]) => terms.some((term) => value.includes(term))

const DOCUMENT_TYPES = new Set([
  "beleg",
  "rechnung",
  "gutschrift",
  "mahnung",
  "inkasso",
  "forderung",
  "vertrag",
  "bescheid",
  "lohnabrechnung",
  "versicherung",
  "steuer",
  "quittung",
  "kassenbon",
  "sonstiges",
])

function cleanCapturedValue(value?: string) {
  return value?.trim().replace(/[.,;:!?]+$/g, "").trim()
}

function extractBusinessContext(rawText: string) {
  const facts: Record<string, unknown> = {}
  const evidence: MilaEvidenceRef[] = []

  const purposeMatch = rawText.match(/\b(?:für|fuer)\s+(.+?)(?=$|[.!?])/i)
  const businessPurpose = cleanCapturedValue(purposeMatch?.[1])
  if (businessPurpose) {
    facts.businessPurpose = businessPurpose
    evidence.push({ type: "field", label: `Expliziter Geschäftskontext im Eingang: ${businessPurpose}` })
  }

  const projectMatch = rawText.match(/\b(?:baustelle|auftrag|projekt)\s+([\p{L}\p{N}][\p{L}\p{N}\- ]*?)(?=\s+(?:mit|und|für|fuer)\b|$|[.,;:!?])/iu)
  const project = cleanCapturedValue(projectMatch?.[0])
  if (project) {
    facts.project = project
    evidence.push({ type: "field", label: `Projekt im Eingang erkannt: ${project}` })
  }

  const vehicleMatch = rawText.match(/\b(?:transporter|fahrzeug|pkw|lkw)\s+[\p{L}\p{N}\-]+/iu)
  const vehicle = cleanCapturedValue(vehicleMatch?.[0])
  if (vehicle) {
    facts.vehicle = vehicle
    evidence.push({ type: "field", label: `Fahrzeug im Eingang erkannt: ${vehicle}` })
  }

  return { facts, evidence }
}

function structuredDocumentType(fields?: Record<string, unknown>) {
  const value = String(fields?.documentType ?? fields?.type ?? "").trim().toLowerCase()
  return DOCUMENT_TYPES.has(value) ? value : undefined
}

export function interpretInput(input: MilaInterpretInput): MilaInterpretation {
  const rawText = [input.subject, input.text, input.fileName]
    .filter(Boolean)
    .join(" ")
    .trim()
  const text = [rawText, JSON.stringify(input.fields ?? {})]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  let detectedType = input.fileName ? "document" : "message"
  let processType: string | undefined
  const extracted = extractBusinessContext(rawText)
  const knownFacts: Record<string, unknown> = { ...extracted.facts, ...(input.fields ?? {}) }
  const missingContext: string[] = []
  const ambiguities: string[] = []
  const evidence: MilaEvidenceRef[] = [...extracted.evidence]
  const documentType = structuredDocumentType(input.fields)

  if (knownFacts.legacyDataset === true) {
    detectedType = "legacy_dataset"
    processType = "legacy_data_handoff"
    evidence.push({ type: "external", label: `Legacy-Datensatz mit ${Number(knownFacts.rowCount ?? 0)} Zeilen` })
    if (knownFacts.mappingConfirmed !== true) missingContext.push("mappingConfirmation")
  } else if (
    documentType ||
    includesAny(text, [
      "rechnung",
      "invoice",
      "beleg",
      "gutschrift",
      "mahnung",
      "inkasso",
      "forderung",
      "vertrag",
      "bescheid",
      "lohnabrechnung",
      "versicherung",
      "quittung",
      "kassenbon",
    ])
  ) {
    detectedType = "accounting_document"
    processType = "document_handoff"
    if (documentType) knownFacts.documentType = documentType
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
    evidence,
  }
}
