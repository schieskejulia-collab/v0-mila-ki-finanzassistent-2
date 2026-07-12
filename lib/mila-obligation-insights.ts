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

function formatDateDE(value?: string) {
  if (!value) return 'dem vereinbarten Termin'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('de-DE')
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
        title: '🧾 Noch keine Verpflichtungen hinterlegt',
        message:
          'Trage Rechnungen, Raten oder Fristen ein. Mila behält die Termine für dich im Blick.',
        level: 'info',
        action: 'none',
      },
    ]
  }

  if (openObligations.length === 0) {
    return [
      {
        id: 'all-obligations-paid',
        title: '🟢 Alles erledigt',
        message:
          'Aktuell sind keine offenen Verpflichtungen oder Fristen hinterlegt.',
        level: 'info',
        action: 'none',
      },
    ]
  }

  const overdue = getOverdueObligations(openObligations)

  const dueSoon = getDueSoonObligations(openObligations, 14).sort(
    (a, b) => {
      const daysA =
        getDaysUntilObligation(a) ?? Number.MAX_SAFE_INTEGER

      const daysB =
        getDaysUntilObligation(b) ?? Number.MAX_SAFE_INTEGER

      return daysA - daysB
    }
  )

  const critical = getCriticalObligations(openObligations)

  const upcoming = getUpcomingObligations(openObligations).slice(0, 5)

  if (overdue.length > 0) {
    const total = overdue.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    )

    insights.push({
      id: 'overdue-obligations',
      title: '🔴 Überfällige Verpflichtungen',
      message:
        overdue.length === 1
          ? `Eine Zahlung über ${money(
              total
            )} ist überfällig. Mila würde zuerst prüfen, ob sie bereits erledigt wurde oder du reagieren solltest.`
          : `${overdue.length} Zahlungen über insgesamt ${money(
              total
            )} sind überfällig. Mila würde zuerst prüfen, welche davon bereits erledigt wurden und wo du reagieren solltest.`,
      level: 'important',
      action: 'review',
    })
  }

  if (critical.length > 0) {
    const total = critical.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    )

    insights.push({
      id: 'critical-obligations',
      title: '🟡 Wichtige Zahlungen im Blick',
      message:
        critical.length === 1
          ? `Eine wichtige Verpflichtung über ${money(
              total
            )} ist noch offen. Diese sollte nicht aus dem Blick geraten.`
          : `${critical.length} wichtige Verpflichtungen über insgesamt ${money(
              total
            )} sind noch offen. Diese sollten nicht aus dem Blick geraten.`,
      level: 'important',
      action: 'review',
    })
  }

  if (dueSoon.length > 0) {
    const next = dueSoon[0]
    const days = getDaysUntilObligation(next)

    if (days !== null) {
      insights.push({
        id: `due-soon-${next.id}`,
        title: days === 0 ? '📅 Heute fällig' : '📅 Bald fällig',
        message:
          days === 0
            ? `Heute wird „${next.title}“ über ${money(
                next.amount
              )} fällig.`
            : days === 1
            ? `Morgen wird „${next.title}“ über ${money(
                next.amount
              )} fällig.`
            : `In ${days} Tagen wird „${next.title}“ über ${money(
                next.amount
              )} fällig.`,
        level: days <= 3 ? 'reminder' : 'info',
        action: 'remind',
        obligationId: next.id,
      })
    }
  }

  if (availableMonthlyAmount > 0) {
    const monthlyOpenTotal = openObligations.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    )

    if (monthlyOpenTotal > availableMonthlyAmount) {
      insights.push({
        id: 'payment-pressure',
        title: '🪬 Zahlungsplan prüfen',
        message: `Deine offenen Verpflichtungen liegen bei ${money(
          monthlyOpenTotal
        )}. Das ist mehr als dein geplanter Spielraum von ${money(
          availableMonthlyAmount
        )}. Mila würde prüfen, ob eine Rate angepasst oder ein Aufschub angefragt werden sollte.`,
        level: 'reminder',
        action: 'ask_delay',
      })
    }
  }

  if (upcoming.length > 0 && insights.length < 3) {
    const total = upcoming.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    )

    insights.push({
      id: 'upcoming-summary',
      title: '🧾 Kommende Verpflichtungen',
      message:
        upcoming.length === 1
          ? `In nächster Zeit steht eine Zahlung über ${money(
              total
            )} an. Mila kann dich rechtzeitig daran erinnern.`
          : `In nächster Zeit stehen ${upcoming.length} Zahlungen über insgesamt ${money(
              total
            )} an. Mila kann dich rechtzeitig daran erinnern.`,
      level: 'info',
      action: 'remind',
    })
  }

  return insights.slice(0, 4)
}

export function createDelayMessage(obligation: Obligation) {
  const dueDate = formatDateDE(getObligationDueDate(obligation))

  return `Guten Tag,

ich möchte höflich anfragen, ob die Zahlung zu „${obligation.title}“ über ${money(
    obligation.amount
  )} statt am ${dueDate} zu einem späteren Termin erfolgen kann.

Bitte teilen Sie mir mit, ob ein Zahlungsaufschub oder alternativ eine angepasste Ratenzahlung möglich ist.

Vielen Dank für Ihre Rückmeldung.

Freundliche Grüße`
}