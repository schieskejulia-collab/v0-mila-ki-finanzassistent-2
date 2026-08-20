export type DocumentQuality = {
  ok: boolean
  issues: string[]
  checks: Array<{ label: string; ok: boolean }>
}

export type PossibleDuplicate = {
  documentId: string
  duplicateOfId: string
  reason: string
}

export type RecurringPattern = {
  key: string
  partner: string
  amount: number | null
  months: string[]
  occurrences: number
  expectedThisMonth: boolean
  presentThisMonth: boolean
  message: string
}

function cleanPart(value: unknown, fallback: string) {
  const cleaned = String(value || '')
    .trim()
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/[^\p{L}\p{N}.,&()+\- ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return (cleaned || fallback).slice(0, 50).replace(/\s+/g, '_')
}

function extensionOf(doc: any) {
  const name = String(doc?.fileName || doc?.file_name || '')
  const match = name.match(/\.([a-z0-9]{2,5})$/i)
  return match ? `.${match[1].toLowerCase()}` : ''
}

function rawDateOf(doc: any) {
  return String(doc?.documentDate || doc?.document_date || doc?.date || doc?.createdAt || doc?.created_at || '')
}

function dateOf(doc: any) {
  const raw = rawDateOf(doc)
  const date = raw ? new Date(raw) : null
  if (!date || Number.isNaN(date.getTime())) return 'Ohne-Datum'
  return date.toISOString().slice(0, 10)
}

function monthOf(doc: any) {
  const raw = rawDateOf(doc)
  const date = raw ? new Date(raw) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 7)
}

function normalizedPartner(doc: any) {
  return String(doc?.partner || doc?.merchant || doc?.vendor || '').trim().toLocaleLowerCase('de-DE').replace(/\s+/g, ' ')
}

function numericAmount(doc: any) {
  const amount = Number(doc?.amount || 0)
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null
}

function invoiceNumberOf(doc: any) {
  return String(doc?.invoiceNumber || doc?.invoice_number || doc?.documentNumber || doc?.document_number || doc?.receiptNumber || doc?.receipt_number || '').trim().toLocaleLowerCase('de-DE')
}

function contentHashOf(doc: any) {
  return String(doc?.fileHash || doc?.file_hash || doc?.contentHash || doc?.content_hash || '').trim().toLocaleLowerCase('de-DE')
}

export function buildDocumentWorkName(doc: any, categoryLabel = 'Unterlage') {
  const partner = cleanPart(doc?.partner || doc?.title, 'Unbekannt')
  const category = cleanPart(categoryLabel, 'Unterlage')
  const amount = Number(doc?.amount || 0)
  const amountPart = Number.isFinite(amount) && amount > 0
    ? `_${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : ''
  return `${dateOf(doc)}_${category}_${partner}${amountPart}${extensionOf(doc)}`
}

// Organisational completeness only. Mila does not decide tax treatment, accounts,
// deductibility or booking amounts here. The check answers one question: can a
// human understand which original this is and where it belongs?
export function checkDocumentQuality(doc: any): DocumentQuality {
  const type = String(doc?.type || 'unterlage').trim().toLowerCase()
  const fileName = String(doc?.fileName || doc?.file_name || '').trim()
  const fileUrl = String(doc?.fileUrl || doc?.file_url || '').trim()
  const title = String(doc?.title || '').trim()
  const partner = String(doc?.partner || '').trim()
  const documentDate = String(doc?.documentDate || doc?.document_date || '').trim()

  const hasFile = Boolean(fileName || fileUrl)
  const hasUsefulTitle = Boolean(title) && !/^(image|img[_-]?\d*|scan[_-]?\d*|beleg|dokument|unterlage)$/i.test(title)
  const contextTypes = new Set(['rechnung','beleg','mahnung','schreiben','bescheid','vertrag'])
  const needsContext = contextTypes.has(type)
  const hasPartner = !needsContext || Boolean(partner)
  const hasDate = !needsContext || Boolean(documentDate)

  const checks = [
    { label: 'Original vorhanden', ok: hasFile },
    { label: 'Bezeichnung verständlich', ok: hasUsefulTitle },
    ...(needsContext ? [{ label: 'Absender / Partner erfasst', ok: hasPartner }, { label: 'Dokumentdatum erfasst', ok: hasDate }] : []),
  ]
  const issues = checks.filter(check => !check.ok).map(check => check.label)
  return { ok: issues.length === 0, issues, checks }
}

// Deliberately conservative: recurring monthly documents are NOT duplicates.
// Mila only flags a duplicate when there is a strong technical or document-level match.
export function findPossibleDuplicates(documents: any[]): PossibleDuplicate[] {
  const result: PossibleDuplicate[] = []
  for (let index = 0; index < documents.length; index += 1) {
    const current = documents[index]
    const currentId = String(current?.id || '')
    if (!currentId) continue
    for (let previousIndex = 0; previousIndex < index; previousIndex += 1) {
      const previous = documents[previousIndex]
      const previousId = String(previous?.id || '')
      if (!previousId) continue
      const currentHash = contentHashOf(current)
      const previousHash = contentHashOf(previous)
      if (currentHash && previousHash && currentHash === previousHash) {
        result.push({ documentId: currentId, duplicateOfId: previousId, reason: 'Identischer Dateiinhalt – bitte prüfen' })
        break
      }
      const invoiceNumber = invoiceNumberOf(current)
      const sameInvoiceNumber = invoiceNumber && invoiceNumber === invoiceNumberOf(previous)
      const samePartner = normalizedPartner(current) && normalizedPartner(current) === normalizedPartner(previous)
      const sameAmount = numericAmount(current) !== null && numericAmount(current) === numericAmount(previous)
      const sameDate = dateOf(current) !== 'Ohne-Datum' && dateOf(current) === dateOf(previous)
      if (sameInvoiceNumber && samePartner && sameAmount && sameDate) {
        result.push({ documentId: currentId, duplicateOfId: previousId, reason: 'Belegnummer, Anbieter, Betrag und Datum stimmen überein – bitte prüfen' })
        break
      }
    }
  }
  return result
}

export function findRecurringPatterns(documents: any[], referenceDate = new Date()): RecurringPattern[] {
  const groups = new Map<string, { partner: string; amount: number | null; months: Set<string> }>()
  for (const doc of documents) {
    const partner = normalizedPartner(doc)
    const month = monthOf(doc)
    if (!partner || !month) continue
    const amount = numericAmount(doc)
    const key = `${partner}|${amount ?? 'variabel'}`
    const existing = groups.get(key) || { partner: String(doc?.partner || doc?.merchant || doc?.vendor || partner), amount, months: new Set<string>() }
    existing.months.add(month)
    groups.set(key, existing)
  }
  const referenceMonth = referenceDate.toISOString().slice(0, 7)
  const previousMonthDate = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() - 1, 1))
  const previousMonth = previousMonthDate.toISOString().slice(0, 7)
  return Array.from(groups.entries()).filter(([, group]) => group.months.size >= 3).map(([key, group]) => {
    const months = Array.from(group.months).sort()
    const presentThisMonth = group.months.has(referenceMonth)
    const expectedThisMonth = group.months.has(previousMonth) && !presentThisMonth
    return { key, partner: group.partner, amount: group.amount, months, occurrences: group.months.size, expectedThisMonth, presentThisMonth, message: expectedThisMonth ? `Wiederkehrendes Muster erkannt. Für ${referenceMonth} wurde bisher kein entsprechender Beleg gefunden. Bitte prüfen.` : `Wiederkehrendes Muster erkannt (${group.months.size} Monate).` }
  })
}
