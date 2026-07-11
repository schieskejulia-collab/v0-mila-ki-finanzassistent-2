export type ObligationType =
  | 'rechnung'
  | 'rate'
  | 'vertrag'
  | 'abo'
  | 'miete'
  | 'inkasso'
  | 'sonstiges'

export type ObligationArea =
  | 'privat'
  | 'business'

export type ObligationStatus =
  | 'offen'
  | 'geplant'
  | 'bezahlt'
  | 'verschoben'
  | 'ueberfaellig'

export type ObligationPriority =
  | 'existenz'
  | 'wichtig'
  | 'normal'

export type Obligation = {
  id: string

  title: string
  partner: string
  creditor?: string

  amount: number

  caseNumber?: string
  originalCreditor?: string
  installmentAmount?: number

  type: ObligationType
  area: ObligationArea

  dueDate: string
  due_date?: string

  status: ObligationStatus
  priority: ObligationPriority

  reminderDays: number[]
  reminder_days?: number

  createdAt?: string
  created_at?: string

  paidAt?: string
  paid_at?: string

  note?: string
}

export function getObligationDueDate(
  obligation: Obligation
) {
  return (
    obligation.dueDate ||
    obligation.due_date ||
    ''
  )
}

export function isObligationPaid(
  obligation: Obligation
) {
  return (
    String(obligation.status)
      .trim()
      .toLowerCase() === 'bezahlt'
  )
}

export function isObligationOpen(
  obligation: Obligation
) {
  return !isObligationPaid(obligation)
}

export function getDaysUntilObligation(
  obligation: Obligation
) {
  const dueDate =
    getObligationDueDate(obligation)

  if (!dueDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  if (Number.isNaN(due.getTime())) {
    return null
  }

  return Math.ceil(
    (due.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  )
}

export function getUpcomingObligations(
  obligations: Obligation[]
) {
  return obligations
    .filter((item) => {
      const days =
        getDaysUntilObligation(item)

      return (
        isObligationOpen(item) &&
        days !== null &&
        days >= 0
      )
    })
    .sort((a, b) => {
      const dateA =
        new Date(
          getObligationDueDate(a)
        ).getTime()

      const dateB =
        new Date(
          getObligationDueDate(b)
        ).getTime()

      return dateA - dateB
    })
}

export function getOverdueObligations(
  obligations: Obligation[]
) {
  return obligations.filter((item) => {
    const days =
      getDaysUntilObligation(item)

    return (
      isObligationOpen(item) &&
      days !== null &&
      days < 0
    )
  })
}

export function getDueSoonObligations(
  obligations: Obligation[],
  withinDays = 3
) {
  return obligations.filter((item) => {
    const days =
      getDaysUntilObligation(item)

    return (
      isObligationOpen(item) &&
      days !== null &&
      days >= 0 &&
      days <= withinDays
    )
  })
}

export function getCriticalObligations(
  obligations: Obligation[]
) {
  return obligations.filter(
    (item) =>
      item.priority === 'existenz' &&
      isObligationOpen(item)
  )
}

export function getInkassoObligations(
  obligations: Obligation[]
) {
  return obligations.filter((item) => {
    const text = `
      ${item.type || ''}
      ${item.title || ''}
      ${item.partner || ''}
      ${item.creditor || ''}
    `.toLowerCase()

    return (
      isObligationOpen(item) &&
      (
        text.includes('inkasso') ||
        text.includes('forderung')
      )
    )
  })
}

export function createDelaySuggestion(
  obligation: Obligation
) {
  const partner =
    obligation.partner ||
    obligation.creditor ||
    'den Anbieter'

  return `Du könntest ${partner} kontaktieren und um eine Anpassung der Zahlung bitten.`
}