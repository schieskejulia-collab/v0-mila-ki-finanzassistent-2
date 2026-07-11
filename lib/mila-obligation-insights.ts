import type { Obligation } from './mila-obligations'
import {
  getCriticalObligations,
  getDaysUntilObligation,
  getDueSoonObligations,
  getObligationDueDate,
  getOverdueObligations,
  getUpcomingObligations,
  isObligationOpen,
} from './mila-obligations'

export type ObligationInsight = {
  id: string
  title: string
  message: string
  level: 'info' | 'reminder' | 'important'
  action?: 'remind' | 'review' | 'ask_delay' | 'none'
  obligationId?: string
}

function money(value: number) {
  return Number(value || 0).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

export function getObligationInsights(
  obligations: Obligation[] = [],
  availableMonthlyAmount = 0
): ObligationInsight[] {
  const insights: ObligationInsight[] = []

  const openObligations = obligations.filter(isObligationOpen)

  if (obligations.length === 0) {
    return [
      {
        id: 'no-obligations',
        title: '🧾 Keine Verpflichtungen hinterlegt',
        message:
          'Wenn du Rechnungen, Raten oder Fristen einträgst, kann Mila dich rechtzeitig erinnern.',
        level: 'info',
        action: 'none',
      },
    ]
  }

  if (openObligations.length === 0) {
    return [
      {
        id: 'all-obligations-paid',
        title: '🟢 Alle Verpflichtungen erledigt',
        message:
          'Aktuell ist keine offene Zahlung oder Frist hinterlegt.',
        level: 'info',
        action: 'none',
      },
    ]
  }

  const overdue = getOverdueObligations(openObligations)

  const dueSoon = getDueSoonObligations(
    openObligations,
    14
  ).sort((a, b) => {
    const daysA =
      getDaysUntilObligation(a) ??
      Number.MAX_SAFE_INTEGER

    const daysB =
      getDaysUntilObligation(b) ??
      Number.MAX_SAFE_INTEGER

    return daysA - daysB
  })

  const critical =
    getCriticalObligations(openObligations)

  const upcoming = getUpcomingObligations(
    openObligations
  ).slice(0, 5)

  if (overdue.length > 0) {
    const total = overdue.reduce(
      (sum, item) =>
        sum + Number(item.amount || 0),
      0
    )

    insights.push({
      id: 'overdue-obligations',
      title: '🔴 Überfällige Fristen',
      message: `${overdue.length} Zahlung${
        overdue.length === 1
          ? ' ist'
          : 'en sind'
      } überfällig (${money(
        total
      )}). Mila würde zuerst prüfen, ob bereits bezahlt wurde oder eine Rückmeldung nötig ist.`,
      level: 'important',
      action: 'review',
    })
  }

  if (critical.length > 0) {
    const total = critical.reduce(
      (sum, item) =>
        sum + Number(item.amount || 0),
      0
    )

    insights.push({
      id: 'critical-obligations',
      title: '🟡 Existenzwichtige Zahlungen',
      message: `${critical.length} wichtige Verpflichtung${
        critical.length === 1
          ? ''
          : 'en'
      } über ${money(
        total
      )} sind offen. Diese sollten nicht still liegen bleiben.`,
      level: 'important',
      action: 'review',
    })
  }

  if (dueSoon.length > 0) {
    const next = dueSoon[0]

    const days =
      getDaysUntilObligation(next)

    if (days !== null) {
      insights.push({
        id: `due-soon-${next.id}`,
        title: '📅 Bald fällig',
        message:
          days === 0
            ? `${next.title} ist heute fällig (${money(
                next.amount
              )}).`
            : `${next.title} ist in ${days} Tag${
                days === 1 ? '' : 'en'
              } fällig (${money(
                next.amount
              )}).`,
        level:
          days <= 3
            ? 'reminder'
            : 'info',
        action: 'remind',
        obligationId: next.id,
      })
    }
  }

  if (availableMonthlyAmount > 0) {
    const monthlyOpenTotal =
      openObligations.reduce(
        (sum, item) =>
          sum + Number(item.amount || 0),
        0
      )

    if (
      monthlyOpenTotal >
      availableMonthlyAmount
    ) {
      insights.push({
        id: 'payment-pressure',
        title: '🪬 Zahlungsplan prüfen',
        message: `Die offenen Verpflichtungen (${money(
          monthlyOpenTotal
        )}) liegen über deinem geplanten Spielraum (${money(
          availableMonthlyAmount
        )}). Mila würde prüfen, ob eine Rate angepasst oder um Aufschub gebeten werden sollte.`,
        level: 'reminder',
        action: 'ask_delay',
      })
    }
  }

  if (
    upcoming.length > 0 &&
    insights.length < 3
  ) {
    const total = upcoming.reduce(
      (sum, item) =>
        sum + Number(item.amount || 0),
      0
    )

    insights.push({
      id: 'upcoming-summary',
      title: '🧾 Kommende Verpflichtungen',
      message: `In nächster Zeit stehen ${upcoming.length} Zahlung${
        upcoming.length === 1
          ? ''
          : 'en'
      } über ${money(
        total
      )} an. Mila kann dich rechtzeitig daran erinnern.`,
      level: 'info',
      action: 'remind',
    })
  }

  return insights.slice(0, 4)
}

export function createDelayMessage(
  obligation: Obligation
) {
  const dueDate =
    getObligationDueDate(obligation)

  return `Guten Tag,

aufgrund einer unerwarteten Ausgabe bitte ich darum, die Zahlung zu "${obligation.title}" über ${money(
    obligation.amount
  )} nicht wie ursprünglich geplant am ${dueDate}, sondern etwas später leisten zu dürfen.

Bitte teilen Sie mir mit, ob ein Zahlungsaufschub oder eine angepasste Rate möglich ist.

Vielen Dank.`
}