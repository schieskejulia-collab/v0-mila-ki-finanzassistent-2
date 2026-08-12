export type DocumentQuality = {
  ok: boolean
  issues: string[]
  checks: Array<{ label: string; ok: boolean }>
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

function dateOf(doc: any) {
  const raw = String(
    doc?.documentDate ||
      doc?.document_date ||
      doc?.date ||
      doc?.createdAt ||
      doc?.created_at ||
      ''
  )
  const date = raw ? new Date(raw) : null
  if (!date || Number.isNaN(date.getTime())) return 'Ohne-Datum'
  return date.toISOString().slice(0, 10)
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

export function checkDocumentQuality(doc: any): DocumentQuality {
  const type = String(doc?.type || '').toLowerCase()
  const fileName = String(doc?.fileName || doc?.file_name || '').trim()
  const fileUrl = String(doc?.fileUrl || doc?.file_url || '').trim()
  const title = String(doc?.title || '').trim()
  const partner = String(doc?.partner || '').trim()
  const amount = Number(doc?.amount || 0)

  const hasFile = Boolean(fileName || fileUrl)
  const hasUsefulTitle = Boolean(title) && !/^(image|img[_-]?\d*|scan[_-]?\d*|beleg|dokument)$/i.test(title)
  const hasPartner = Boolean(partner)
  const needsAmount = ['beleg', 'rechnung'].includes(type)
  const hasAmount = !needsAmount || (Number.isFinite(amount) && amount > 0)

  const checks = [
    { label: 'Datei vorhanden', ok: hasFile },
    { label: 'Bezeichnung brauchbar', ok: hasUsefulTitle },
    { label: 'Anbieter / Absender erkannt', ok: hasPartner },
    ...(needsAmount ? [{ label: 'Betrag erkannt', ok: hasAmount }] : []),
  ]

  const issues = checks.filter((check) => !check.ok).map((check) => check.label)
  return { ok: issues.length === 0, issues, checks }
}
