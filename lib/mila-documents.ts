export type MilaDocumentType =
  | 'beleg'
  | 'rechnung'
  | 'vertrag'
  | 'bescheid'
  | 'inkasso'
  | 'sonstiges'

export type MilaDocumentStatus =
  | 'neu'
  | 'geprueft'
  | 'erledigt'
  | 'archiviert'

export type MilaDocument = {
  id: string

  title: string
  partner?: string
  amount?: number

  type: MilaDocumentType
  status: MilaDocumentStatus

  documentDate?: string
  dueDate?: string

  relatedObligationId?: string
  relatedBookingId?: string

  fileName?: string
  fileUrl?: string

  keepUntil?: string
  note?: string

  createdAt: string
}

export function createDocument(data: Partial<MilaDocument>): MilaDocument {
  return {
    id: data.id || crypto.randomUUID(),
    title: data.title || 'Dokument',
    partner: data.partner || '',
    amount: data.amount,

    type: data.type || 'sonstiges',
    status: data.status || 'neu',

    documentDate: data.documentDate,
    dueDate: data.dueDate,

    relatedObligationId: data.relatedObligationId,
    relatedBookingId: data.relatedBookingId,

    fileName: data.fileName,
    fileUrl: data.fileUrl,

    keepUntil:
      data.keepUntil ||
      new Date(
        new Date().setFullYear(new Date().getFullYear() + 1)
      )
        .toISOString()
        .slice(0, 10),

    note: data.note || '',
    createdAt: data.createdAt || new Date().toISOString(),
  }
}

export function documentFromRow(row: any): MilaDocument {
  return createDocument({
    id: row.id,
    title: row.title,
    partner: row.partner,
    amount: row.amount == null ? undefined : Number(row.amount),
    type: row.type,
    status: row.status,
    documentDate: row.document_date || undefined,
    dueDate: row.due_date || undefined,
    relatedObligationId: row.related_obligation_id || undefined,
    relatedBookingId: row.related_booking_id || undefined,
    fileName: row.file_name || undefined,
    fileUrl: row.file_url || undefined,
    keepUntil: row.keep_until || undefined,
    note: row.note || '',
    createdAt: row.created_at,
  })
}

export function isDeadlineDocument(document: MilaDocument) {
  return Boolean(document.dueDate)
}

export function isDebtOrCreditorDocument(document: MilaDocument) {
  return document.type === 'inkasso' || document.type === 'bescheid'
}