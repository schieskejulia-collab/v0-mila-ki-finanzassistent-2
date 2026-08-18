import type { MilaInterpretInput } from "./interpreter"
import type { MilaConfidence, MilaEvidenceRef, MilaInputSource } from "./types"

export interface MilaDocumentScanResult {
  title?: string
  vendor?: string
  partner?: string
  amount?: number | string
  dueDate?: string
  due_date?: string
  documentDate?: string
  documentType?: string
  type?: string
  invoiceNumber?: string
  caseNumber?: string
  originalCreditor?: string
  installmentAmount?: number | string
  category?: string
  suggestedCategory?: string
  note?: string
  isObligation?: boolean
  needsConfirmation?: boolean
  confidence?: number | string
  fileName?: string
  businessPurpose?: string
  project?: string
  vehicle?: string
  contact?: string
  client?: string
  [key: string]: unknown
}

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

function cleanText(value: unknown) {
  return String(value ?? "").trim()
}

function cleanNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  const raw = cleanText(value)
  if (!raw) return undefined
  const normalized = raw
    .replace(/\s/g, "")
    .replace(/€/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "")
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeConfidence(value: unknown, needsConfirmation = false): MilaConfidence {
  const parsed = Number(value)
  if (Number.isFinite(parsed)) {
    const normalized = parsed > 1 ? parsed / 100 : parsed
    if (normalized >= 0.8 && !needsConfirmation) return "high"
    if (normalized >= 0.5) return "medium"
    return "low"
  }
  return needsConfirmation ? "medium" : "high"
}

function normalizeDocumentType(value: unknown) {
  const normalized = cleanText(value).toLowerCase()
  return DOCUMENT_TYPES.has(normalized) ? normalized : normalized || "sonstiges"
}

function addFact(target: Record<string, unknown>, field: string, value: unknown) {
  if (value === undefined || value === null || value === "") return
  target[field] = value
}

/**
 * Converts the output of Mila's existing PDF/image scanners into the generic
 * input contract used by Mila Core. This deliberately does not infer a
 * business purpose from a vendor or category: unclear business context must
 * still be confirmed by a human or resolved through Context Memory.
 */
export function buildDocumentCoreInput(
  scan: MilaDocumentScanResult,
  options: { source?: MilaInputSource; caseId?: string } = {},
): MilaInterpretInput & { scannerConfidence: MilaConfidence; scannerEvidence: MilaEvidenceRef[] } {
  const source = options.source ?? "upload"
  const documentType = normalizeDocumentType(scan.documentType ?? scan.type)
  const vendor = cleanText(scan.vendor ?? scan.partner)
  const title = cleanText(scan.title)
  const note = cleanText(scan.note)
  const fileName = cleanText(scan.fileName)
  const amount = cleanNumber(scan.amount)
  const installmentAmount = cleanNumber(scan.installmentAmount)
  const needsConfirmation = Boolean(scan.needsConfirmation)
  const scannerConfidence = normalizeConfidence(scan.confidence, needsConfirmation)

  const fields: Record<string, unknown> = {}
  addFact(fields, "documentType", documentType)
  addFact(fields, "title", title)
  addFact(fields, "vendor", vendor)
  addFact(fields, "amount", amount)
  addFact(fields, "dueDate", cleanText(scan.dueDate ?? scan.due_date))
  addFact(fields, "documentDate", cleanText(scan.documentDate))
  addFact(fields, "invoiceNumber", cleanText(scan.invoiceNumber))
  addFact(fields, "caseNumber", cleanText(scan.caseNumber))
  addFact(fields, "originalCreditor", cleanText(scan.originalCreditor))
  addFact(fields, "installmentAmount", installmentAmount)
  addFact(fields, "category", cleanText(scan.category))
  addFact(fields, "suggestedCategory", cleanText(scan.suggestedCategory))
  addFact(fields, "isObligation", scan.isObligation)
  addFact(fields, "businessPurpose", cleanText(scan.businessPurpose))
  addFact(fields, "project", cleanText(scan.project))
  addFact(fields, "vehicle", cleanText(scan.vehicle))
  addFact(fields, "contact", cleanText(scan.contact))
  addFact(fields, "client", cleanText(scan.client))

  const scannerEvidence: MilaEvidenceRef[] = [
    {
      type: "document",
      label: fileName || title || `Scannergebnis: ${documentType}`,
    },
  ]

  const text = [
    documentType,
    title,
    vendor,
    note,
    scan.category ? `Kategorie ${cleanText(scan.category)}` : "",
    scan.suggestedCategory ? `Kategorievorschlag ${cleanText(scan.suggestedCategory)}` : "",
  ]
    .filter(Boolean)
    .join(" · ")

  return {
    source,
    caseId: options.caseId,
    subject: title || `${documentType} von ${vendor || "unbekannt"}`,
    text,
    fileName: fileName || undefined,
    fields,
    scannerConfidence,
    scannerEvidence,
  }
}
