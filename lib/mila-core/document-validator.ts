import type { MilaInterpretation } from "./types"

export interface MilaDocumentValidationIssue {
  field: string
  type: "missing" | "conflict" | "invalid"
  message: string
}

export interface MilaDocumentValidationResult {
  complete: boolean
  conflicts: boolean
  issues: MilaDocumentValidationIssue[]
}

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== ""
}

function numericValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined
  const normalized = String(value ?? "")
    .replace(/\s/g, "")
    .replace(/€/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "")
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

function addMissing(issues: MilaDocumentValidationIssue[], facts: Record<string, unknown>, field: string, message: string) {
  if (!hasValue(facts[field])) issues.push({ field, type: "missing", message })
}

export function validateDocumentInterpretation(interpretation: MilaInterpretation): MilaDocumentValidationResult {
  if (interpretation.detectedType !== "accounting_document") {
    return { complete: true, conflicts: false, issues: [] }
  }

  const facts = interpretation.knownFacts
  const type = String(facts.documentType ?? "document")
  const issues: MilaDocumentValidationIssue[] = []

  addMissing(issues, facts, "documentType", "Dokumenttyp fehlt.")

  if (["invoice", "credit_note", "reminder", "receipt"].includes(type)) {
    addMissing(issues, facts, "vendor", "Anbieter oder Absender fehlt.")
  }

  if (["invoice", "credit_note", "reminder", "receipt"].includes(type)) {
    addMissing(issues, facts, "amount", "Betrag fehlt.")
  }

  if (["invoice", "credit_note"].includes(type) && !hasValue(facts.businessPurpose)) {
    issues.push({
      field: "businessPurpose",
      type: "missing",
      message: "Geschäftszweck ist für eine sichere Zuordnung noch nicht bestätigt.",
    })
  }

  if (type === "reminder" && !hasValue(facts.invoiceNumber) && !hasValue(facts.caseNumber)) {
    issues.push({
      field: "reference",
      type: "missing",
      message: "Für die Mahnung fehlt eine Rechnungs-, Vorgangs- oder Referenznummer.",
    })
  }

  const amount = numericValue(facts.amount)
  if (amount !== undefined && amount < 0 && type !== "credit_note") {
    issues.push({
      field: "amount",
      type: "conflict",
      message: "Negativer Betrag passt nicht zum erkannten Dokumenttyp.",
    })
  }

  if (type === "credit_note" && amount !== undefined && amount === 0) {
    issues.push({
      field: "amount",
      type: "invalid",
      message: "Gutschrift hat keinen verwertbaren Betrag.",
    })
  }

  const dueDate = String(facts.dueDate ?? "").trim()
  const documentDate = String(facts.documentDate ?? "").trim()
  if (dueDate && documentDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) && /^\d{4}-\d{2}-\d{2}$/.test(documentDate)) {
    if (new Date(dueDate).getTime() < new Date(documentDate).getTime()) {
      issues.push({
        field: "dueDate",
        type: "conflict",
        message: "Fälligkeitsdatum liegt vor dem Dokumentdatum.",
      })
    }
  }

  const category = String(facts.category ?? "").trim().toLowerCase()
  const suggestedCategory = String(facts.suggestedCategory ?? "").trim().toLowerCase()
  if (category && suggestedCategory && category !== suggestedCategory) {
    issues.push({
      field: "category",
      type: "conflict",
      message: "Erkannte Kategorie und Kategorievorschlag widersprechen sich.",
    })
  }

  const conflicts = issues.some((issue) => issue.type === "conflict" || issue.type === "invalid")
  const complete = issues.length === 0

  return { complete, conflicts, issues }
}
