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

const DOCUMENT_TYPE_ALIASES: Array<{ type: string; terms: string[] }> = [
  { type: "invoice", terms: ["rechnung", "invoice"] },
  { type: "receipt", terms: ["quittung", "kassenbon", "bon", "receipt", "beleg"] },
  { type: "credit_note", terms: ["gutschrift", "credit note"] },
  { type: "reminder", terms: ["mahnung", "zahlungserinnerung", "reminder"] },
  { type: "delivery_note", terms: ["lieferschein", "delivery note"] },
  { type: "order_confirmation", terms: ["auftragsbestätigung", "auftragsbestaetigung", "order confirmation"] },
  { type: "contract", terms: ["vertrag", "contract"] },
  { type: "bank_statement", terms: ["kontoauszug", "bank statement"] },
  { type: "payroll_document", terms: ["lohnabrechnung", "gehaltsabrechnung", "payroll"] },
  { type: "tax_document", terms: ["steuerbescheid", "tax assessment"] },
]

const DOCUMENT_HINT_FIELDS = [
  "documentType",
  "invoiceNumber",
  "amount",
  "vendor",
  "supplier",
  "documentDate",
  "dueDate",
  "category",
  "suggestedCategory",
  "businessPurpose",
]

function hasUsefulValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== ""
}

function normalizeDocumentType(fields: Record<string, unknown>, text: string) {
  const explicit = String(fields.documentType ?? fields.type ?? "").trim().toLowerCase()
  const searchable = `${explicit} ${text}`
  return DOCUMENT_TYPE_ALIASES.find((entry) => includesAny(searchable, entry.terms))?.type ?? (explicit || "document")
}

function looksLikeDocument(input: MilaInterpretInput, text: string) {
  if (input.fileName) return true
  if (DOCUMENT_HINT_FIELDS.some((field) => hasUsefulValue(input.fields?.[field]))) return true
  return DOCUMENT_TYPE_ALIASES.some((entry) => includesAny(text, entry.terms))
}

export function interpretInput(input: MilaInterpretInput): MilaInterpretation {
  const fields = { ...(input.fields ?? {}) }
  const text = [input.subject, input.text, input.fileName, JSON.stringify(fields)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  let detectedType = input.fileName ? "document" : "message"
  let processType: string | undefined
  const knownFacts: Record<string, unknown> = fields
  const missingContext: string[] = []
  const ambiguities: string[] = []
  const evidence = Object.keys(fields).map((field) => ({ type: "field" as const, label: field }))

  if (looksLikeDocument(input, text)) {
    const documentType = normalizeDocumentType(fields, text)
    detectedType = "accounting_document"
    processType = "document_handoff"
    knownFacts.documentType = documentType

    // Mila asks only for context that is actually needed for a safe handoff.
    // We do not force invoice-specific fields onto receipts, reminders, contracts, etc.
    if (["invoice", "receipt", "credit_note"].includes(documentType) && !hasUsefulValue(knownFacts.businessPurpose)) {
      missingContext.push("businessPurpose")
    }

    if (!hasUsefulValue(knownFacts.vendor) && hasUsefulValue(knownFacts.supplier)) {
      knownFacts.vendor = knownFacts.supplier
    }

    if (hasUsefulValue(knownFacts.category) && !hasUsefulValue(knownFacts.suggestedCategory)) {
      knownFacts.suggestedCategory = knownFacts.category
    }
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
