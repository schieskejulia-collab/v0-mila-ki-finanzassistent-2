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
  amount: number
  caseNumber?: string
  originalCreditor?: string
  installmentAmount?: number
  type: ObligationType
  area: ObligationArea

  dueDate: string
  status: ObligationStatus

  priority: ObligationPriority

  reminderDays: number[]

  note?: string
}


export function getUpcomingObligations(
  obligations: Obligation[]
) {
  const today = new Date()

  return obligations
    .filter((item) => {
      return (
        item.status === 'geplant' &&
        new Date(item.dueDate) >= today
      )
    })
    .sort(
      (a, b) =>
        new Date(a.dueDate).getTime() -
        new Date(b.dueDate).getTime()
    )
}


export function getCriticalObligations(
  obligations: Obligation[]
) {
  return obligations.filter(
    (item) =>
      item.priority === 'existenz' &&
      item.status !== 'bezahlt'
  )
}


export function createDelaySuggestion(
  obligation: Obligation
) {
  return `Du könntest ${obligation.partner} kontaktieren und um eine Anpassung der Zahlung bitten.`
}