import { buildDocumentCoreInput, type MilaDocumentScanResult } from './document-intelligence'
import { buildProcessPlan } from './process-engine'
import type { MilaMemoryContext, MilaProcessPlan, MilaTargetSystem } from './types'

export type MilaFinancialDirection = 'income' | 'expense' | 'neutral' | 'unknown'
export type MilaDocumentScope =
  | 'business'
  | 'employee'
  | 'health'
  | 'insurance'
  | 'vehicle'
  | 'household'
  | 'private'
  | 'mixed'
  | 'unknown'

export type MilaLineItemRelevance = 'include' | 'exclude' | 'needs_context'

export interface MilaLineItemScan {
  description?: string
  amount?: number | string
  quantity?: number | string
  category?: string
  scope?: MilaDocumentScope | string
  businessPurpose?: string
  relevance?: MilaLineItemRelevance | string
  confidence?: number | string
  [key: string]: unknown
}

export interface MilaBatchScan extends MilaDocumentScanResult {
  id?: string
  financialDirection?: MilaFinancialDirection | string
  direction?: MilaFinancialDirection | string
  scope?: MilaDocumentScope | string
  lineItems?: MilaLineItemScan[]
  items?: MilaLineItemScan[]
  paymentConfirmed?: boolean
  paid?: boolean
  received?: boolean
  [key: string]: unknown
}

export interface MilaBatchContext {
  caseId?: string
  userMode?: 'employee' | 'business' | 'mixed'
  clientName?: string
  target?: MilaTargetSystem
  memory?: MilaMemoryContext
}

export interface MilaReviewQuestion {
  id: string
  documentId: string
  field: string
  question: string
  reason: string
  options?: string[]
}

export interface MilaSortedDocument {
  id: string
  title: string
  vendor: string
  amount?: number
  documentType: string
  documentDate?: string
  financialDirection: MilaFinancialDirection
  scope: MilaDocumentScope
  storageGroup: string
  storageKey: string
  lineItems: Array<{
    description: string
    amount?: number
    scope: MilaDocumentScope
    relevance: MilaLineItemRelevance
    reason: string
  }>
  status: 'auto_sorted' | 'needs_review'
  reasons: string[]
  questions: MilaReviewQuestion[]
  plan: MilaProcessPlan
}

export interface MilaBatchSortResult {
  summary: {
    received: number
    autoSorted: number
    needsReview: number
    lineItems: number
    lineItemsNeedingContext: number
  }
  documents: MilaSortedDocument[]
  reviewQueue: MilaReviewQuestion[]
}

function text(value: unknown) {
  return String(value ?? '').trim()
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const raw = text(value)
  if (!raw) return undefined
  const normalized = raw
    .replace(/\s/g, '')
    .replace(/€/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

function confidence(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return undefined
  return parsed > 1 ? Math.min(parsed / 100, 1) : Math.max(0, Math.min(parsed, 1))
}

function normalizeDirection(value: unknown): MilaFinancialDirection {
  const normalized = text(value).toLowerCase()
  if (['income', 'einnahme', 'einnahmen', 'revenue'].includes(normalized)) return 'income'
  if (['expense', 'ausgabe', 'ausgaben', 'cost'].includes(normalized)) return 'expense'
  if (['neutral', 'none', 'kein geldvorgang'].includes(normalized)) return 'neutral'
  return 'unknown'
}

function normalizeScope(value: unknown): MilaDocumentScope {
  const normalized = text(value).toLowerCase()
  if (['business', 'betrieblich', 'betrieb', 'gewerbe', 'unternehmen'].includes(normalized)) return 'business'
  if (['employee', 'arbeitnehmer', 'angestellt', 'beruflich'].includes(normalized)) return 'employee'
  if (['health', 'gesundheit', 'medizin', 'apotheke'].includes(normalized)) return 'health'
  if (['insurance', 'versicherung', 'versicherungen'].includes(normalized)) return 'insurance'
  if (['vehicle', 'fahrzeug', 'auto', 'kfz'].includes(normalized)) return 'vehicle'
  if (['household', 'haushalt'].includes(normalized)) return 'household'
  if (['private', 'privat'].includes(normalized)) return 'private'
  if (['mixed', 'gemischt'].includes(normalized)) return 'mixed'
  return 'unknown'
}

function inferDocumentType(scan: MilaBatchScan) {
  const type = text(scan.documentType ?? scan.type).toLowerCase()
  return type || 'sonstiges'
}

function inferDirection(scan: MilaBatchScan): MilaFinancialDirection {
  const explicit = normalizeDirection(scan.financialDirection ?? scan.direction)
  if (explicit !== 'unknown') return explicit

  const type = inferDocumentType(scan)
  const combined = `${text(scan.title)} ${text(scan.note)} ${type}`.toLowerCase()

  if (type === 'gutschrift' && /erhalten|eingang|ausgezahlt|gutgeschrieben/.test(combined)) return 'income'
  if (/ausgangsrechnung|zahlungseingang|honorar erhalten|einnahme/.test(combined)) return 'income'
  if (/kassenbon|quittung|eingangsrechnung|beleg/.test(type) || /bezahlt|kartenzahlung|barzahlung/.test(combined)) return 'expense'

  // A mere invoice or contract is not treated as an actual income/expense stock
  // unless the scan explicitly proves payment/receipt.
  if (type === 'rechnung') {
    if (scan.paymentConfirmed === true || scan.paid === true) return 'expense'
    if (scan.received === true) return 'income'
    return 'neutral'
  }

  return 'neutral'
}

function inferScope(scan: MilaBatchScan): MilaDocumentScope {
  const explicit = normalizeScope(scan.scope)
  if (explicit !== 'unknown') return explicit

  const type = inferDocumentType(scan)
  if (type === 'versicherung') return 'insurance'
  if (type === 'lohnabrechnung') return 'employee'

  // Vendor/category words may suggest a document family, but never prove
  // business relevance. Keep ambiguous purchases unresolved.
  const combined = `${text(scan.title)} ${text(scan.vendor ?? scan.partner)} ${text(scan.note)}`.toLowerCase()
  if (/apotheke|rezept|medikament|arzt|zahnarzt|heilmittel/.test(combined)) return 'health'
  if (/versicherung|police|beitrag/.test(combined)) return 'insurance'

  return 'unknown'
}

function normalizeLineItems(scan: MilaBatchScan, documentId: string) {
  const rawItems = Array.isArray(scan.lineItems)
    ? scan.lineItems
    : Array.isArray(scan.items)
      ? scan.items
      : []

  return rawItems.map((item, index) => {
    const itemScope = normalizeScope(item.scope)
    const explicitRelevance = text(item.relevance).toLowerCase()
    const itemConfidence = confidence(item.confidence)
    let relevance: MilaLineItemRelevance = 'needs_context'
    let reason = 'Verwendungszweck der Position ist nicht sicher belegt.'

    if (explicitRelevance === 'include') {
      relevance = 'include'
      reason = 'Position wurde ausdrücklich als relevant bestätigt.'
    } else if (explicitRelevance === 'exclude') {
      relevance = 'exclude'
      reason = 'Position wurde ausdrücklich als privat/nicht relevant bestätigt.'
    } else if (itemScope === 'private') {
      relevance = 'exclude'
      reason = 'Position ist ausdrücklich als privat gekennzeichnet.'
    } else if (text(item.businessPurpose)) {
      relevance = itemConfidence !== undefined && itemConfidence < 0.7 ? 'needs_context' : 'include'
      reason = relevance === 'include'
        ? 'Ein konkreter Verwendungszweck ist am Datensatz hinterlegt.'
        : 'Verwendungszweck wurde erkannt, aber nicht sicher genug.'
    }

    return {
      id: `${documentId}-item-${index + 1}`,
      description: text(item.description) || `Position ${index + 1}`,
      amount: numberValue(item.amount),
      scope: itemScope,
      relevance,
      reason,
    }
  })
}

function storageGroup(direction: MilaFinancialDirection, scope: MilaDocumentScope, documentType: string) {
  if (scope === 'health') return 'Gesundheit'
  if (scope === 'insurance') return 'Versicherungen'
  if (documentType === 'lohnabrechnung') return 'Lohn & Arbeit'
  if (direction === 'income') return 'Einnahmen'
  if (direction === 'expense') return 'Ausgaben'
  return 'Nachweise'
}

function monthKey(value: unknown) {
  const raw = text(value)
  const date = raw ? new Date(raw) : new Date()
  if (Number.isNaN(date.getTime())) return 'ohne-datum'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function makeQuestion(documentId: string, field: string, question: string, reason: string, options?: string[]): MilaReviewQuestion {
  return {
    id: `${documentId}-${field}`,
    documentId,
    field,
    question,
    reason,
    options,
  }
}

export function sortDocumentBatch(
  scans: MilaBatchScan[],
  context: MilaBatchContext = {},
): MilaBatchSortResult {
  const documents: MilaSortedDocument[] = scans.map((scan, index) => {
    const id = text(scan.id) || `doc-${index + 1}`
    const coreInput = buildDocumentCoreInput(scan, { source: 'upload', caseId: context.caseId })
    const plan = buildProcessPlan({
      ...coreInput,
      target: context.target,
      memory: context.memory,
    })

    const title = text(scan.title) || coreInput.subject
    const vendor = text(scan.vendor ?? scan.partner)
    const amount = numberValue(scan.amount)
    const documentType = inferDocumentType(scan)
    const direction = inferDirection(scan)
    const scope = inferScope(scan)
    const lineItems = normalizeLineItems(scan, id)
    const reasons: string[] = []
    const questions: MilaReviewQuestion[] = []

    if (!vendor && !['lohnabrechnung', 'sonstiges'].includes(documentType)) {
      reasons.push('Absender/Anbieter ist nicht sicher erkannt.')
      questions.push(makeQuestion(
        id,
        'vendor',
        `Wer hat „${title}“ ausgestellt?`,
        'Mila braucht den Absender für eine verlässliche Ablage und Zuordnung.',
      ))
    }

    if (scope === 'unknown' && direction === 'expense') {
      reasons.push('Der tatsächliche Verwendungsbereich der Ausgabe ist nicht belegt.')
      questions.push(makeQuestion(
        id,
        'scope',
        `Wofür wurde „${title}“ verwendet?`,
        'Händler oder Produktname allein beweisen keinen betrieblichen oder beruflichen Zusammenhang.',
        context.userMode === 'business'
          ? ['Betrieblich', 'Privat', 'Gemischt']
          : context.userMode === 'employee'
            ? ['Beruflich', 'Privat', 'Gemischt']
            : ['Betrieblich', 'Beruflich', 'Privat', 'Gemischt'],
      ))
    }

    const unresolvedItems = lineItems.filter((item) => item.relevance === 'needs_context')
    if (lineItems.length > 0 && unresolvedItems.length > 0) {
      reasons.push(`${unresolvedItems.length} Position(en) auf dem Beleg brauchen Kontext.`)
      for (const item of unresolvedItems.slice(0, 6)) {
        questions.push(makeQuestion(
          id,
          `lineItem:${item.id}`,
          `Wofür war „${item.description}“${item.amount !== undefined ? ` (${item.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })})` : ''}?`,
          'Bei gemischten Belegen bewertet Mila Positionen getrennt und rät nicht anhand des Händlers.',
          ['Relevant', 'Privat', 'Nicht sicher'],
        ))
      }
    }

    if (plan.questions.length > 0) {
      for (const question of plan.questions) {
        if (questions.some((existing) => existing.field === question.field)) continue
        questions.push(makeQuestion(id, question.field, question.question, question.reason))
      }
    }

    const scanConfidence = confidence(scan.confidence)
    if (scanConfidence !== undefined && scanConfidence < 0.7) {
      reasons.push('Scannergebnis hat niedrige Sicherheit.')
    }

    const group = storageGroup(direction, scope, documentType)
    const period = monthKey(scan.documentDate)
    const status = questions.length > 0 || reasons.length > 0 ? 'needs_review' : 'auto_sorted'

    return {
      id,
      title,
      vendor,
      amount,
      documentType,
      documentDate: text(scan.documentDate) || undefined,
      financialDirection: direction,
      scope,
      storageGroup: group,
      storageKey: `${period}/${group}`,
      lineItems,
      status,
      reasons,
      questions,
      plan,
    }
  })

  const reviewQueue = documents.flatMap((document) => document.questions)
  const allLineItems = documents.flatMap((document) => document.lineItems)

  return {
    summary: {
      received: documents.length,
      autoSorted: documents.filter((document) => document.status === 'auto_sorted').length,
      needsReview: documents.filter((document) => document.status === 'needs_review').length,
      lineItems: allLineItems.length,
      lineItemsNeedingContext: allLineItems.filter((item) => item.relevance === 'needs_context').length,
    },
    documents: [...documents].sort((a, b) => {
      const group = a.storageKey.localeCompare(b.storageKey, 'de')
      if (group !== 0) return group
      return (a.documentDate || '').localeCompare(b.documentDate || '')
    }),
    reviewQueue,
  }
}
