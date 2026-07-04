import type { Obligation } from './mila-obligations'
import { getUpcomingObligations, getCriticalObligations } from './mila-obligations'

export type ObligationInsight = {
  id: string
  title: string
  message: string
  severity: 'info' | 'medium' | 'high'
  action?: 'remind' | 'review' | 'ask_delay' | 'none'
  obligationId?: string
}

function money(value: number) {
  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function daysUntil(date: string) {
  const today = new Date()
  const target = new Date(date)

  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)

  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function getObligationInsights(
  obligations: Obligation[] = [],
  availableMonthlyAmount = 0
): ObligationInsight[] {
  const insights: ObligationInsight[] = []

  if (obligations.length === 0) {
    return [
      {
        id: 'no-obligations',
        title: '🧾 Keine Verpflichtungen hinterlegt',
        message:
          'Wenn du Rechnungen, Raten oder Fristen einträgst, kann Mila dich rechtzeitig erinnern.',
        severity: 'info',
        action: 'none',
      },
    ]
  }

  const unpaid = obligations.filter((item) => item.status !== 'bezahlt')
  const overdue = unpaid.filter((item) => daysUntil(item.dueDate) < 0)
  const dueSoon = unpaid
    .filter((item) => {
      const days = daysUntil(item.dueDate)
      return days >= 0 && days <= 14
    })
    .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate))

  const critical = getCriticalObligations(obligations)
  const upcoming = getUpcomingObligations(obligations).slice(0, 5)

  if (overdue.length > 0) {
    const total = overdue.reduce((sum, item) => sum + item.amount, 0)

    insights.push({
      id: 'overdue-obligations',
      title: '🔴 Überfällige Fristen',
      message: `${overdue.length} Zahlung${
        overdue.length === 1 ? ' ist' : 'en sind'
      } überfällig (${money(total)}). Mila würde zuerst klären, ob Zahlung, Aufschub oder Rückmeldung nötig ist.`,
      severity: 'high',
      action: 'review',
    })
  }

  if (critical.length > 0) {
    const total = critical.reduce((sum, item) => sum + item.amount, 0)

    insights.push({
      id: 'critical-obligations',
      title: '🟡 Existenzwichtige Zahlungen',
      message: `${critical.length} wichtige Verpflichtung${
        critical.length === 1 ? '' : 'en'
      } über ${money(total)} sind offen. Diese sollten nicht still liegen bleiben.`,
      severity: 'high',
      action: 'review',
    })
  }

  if (dueSoon.length > 0) {
    const next = dueSoon[0]
    const days = daysUntil(next.dueDate)

    insights.push({
      id: `due-soon-${next.id}`,
      title: '📅 Bald fällig',
      message:
        days === 0
          ? `${next.title} ist heute fällig (${money(next.amount)}).`
          : `${next.title} ist in ${days} Tag${
              days === 1 ? '' : 'en'
            } fällig (${money(next.amount)}).`,
      severity: days <= 3 ? 'medium' : 'info',
      action: 'remind',
      obligationId: next.id,
    })
  }

  if (availableMonthlyAmount > 0) {
    const monthlyOpenTotal = unpaid.reduce((sum, item) => sum + item.amount, 0)

    if (monthlyOpenTotal > availableMonthlyAmount) {
      insights.push({
        id: 'payment-pressure',
        title: '🪬 Zahlungsplan prüfen',
        message: `Die offenen Verpflichtungen (${money(
          monthlyOpenTotal
        )}) liegen über deinem geplanten Spielraum (${money(
          availableMonthlyAmount
        )}). Mila würde prüfen, ob eine Rate verschoben oder um Aufschub gebeten werden sollte.`,
        severity: 'medium',
        action: 'ask_delay',
      })
    }
  }

  if (upcoming.length > 0 && insights.length < 3) {
    const total = upcoming.reduce((sum, item) => sum + item.amount, 0)

    insights.push({
      id: 'upcoming-summary',
      title: '🧾 Kommende Verpflichtungen',
      message: `In nächster Zeit stehen ${upcoming.length} Zahlung${
        upcoming.length === 1 ? '' : 'en'
      } über ${money(total)} an. Mila kann dich rechtzeitig daran erinnern.`,
      severity: 'info',
      action: 'remind',
    })
  }

  return insights.slice(0, 4)
}

export function createDelayMessage(obligation: Obligation) {
  return `Guten Tag,

aufgrund einer unerwarteten Ausgabe bitte ich darum, die Zahlung zu "${obligation.title}" über ${money(
    obligation.amount
  )} nicht wie ursprünglich geplant am ${obligation.dueDate}, sondern etwas später leisten zu dürfen.

Bitte teilen Sie mir mit, ob ein Zahlungsaufschub oder eine angepasste Rate möglich ist.

Vielen Dank.`
}