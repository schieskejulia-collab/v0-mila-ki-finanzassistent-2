import type { Expense, Income } from './store'
import type { Obligation } from './mila-obligations'

export type MilaFinanceAnalysisItem = {
  id: string
  title: string
  message: string
  type: 'good' | 'info' | 'warning' | 'danger'
  priority: number
}

type FinanceAnalysisInput = {
  expenses?: Expense[]
  incomes?: Income[]
  obligations?: Obligation[]
  taxReserve?: number
}

function money(value: number) {
  return Number(value || 0).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function number(value: unknown) {
  const parsed = Number(
    String(value ?? '').replace(',', '.')
  )

  return Number.isFinite(parsed) ? parsed : 0
}

function getDueDate(item: any) {
  return String(
    item.dueDate ||
      item.due_date ||
      ''
  )
}

function getStatus(item: any) {
  return String(
    item.status || 'offen'
  ).toLowerCase()
}

function daysUntil(value: string) {
  if (!value) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dueDate = new Date(value)

  if (Number.isNaN(dueDate.getTime())) {
    return null
  }

  dueDate.setHours(0, 0, 0, 0)

  return Math.ceil(
    (dueDate.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  )
}

export function getMilaFinanceAnalysis({
  expenses = [],
  incomes = [],
  obligations = [],
  taxReserve = 0,
}: FinanceAnalysisInput): MilaFinanceAnalysisItem[] {
  const findings: MilaFinanceAnalysisItem[] = []

  const totalIncome = incomes.reduce(
    (sum, item) =>
      sum + number(item.amount),
    0
  )

  const totalExpenses = expenses.reduce(
    (sum, item) =>
      sum + number(item.amount),
    0
  )

  const balance =
    totalIncome - totalExpenses

  const openObligations = obligations.filter(
    (item: any) => {
      const status = getStatus(item)

      return (
        status !== 'bezahlt' &&
        status !== 'erledigt'
      )
    }
  )

  const openObligationAmount =
    openObligations.reduce(
      (sum, item) =>
        sum + number(item.amount),
      0
    )

  const availableAfterObligations =
    balance - openObligationAmount

  const overdueObligations =
    openObligations.filter((item: any) => {
      const days = daysUntil(
        getDueDate(item)
      )

      return days !== null && days < 0
    })

  const dueSoonObligations =
    openObligations.filter((item: any) => {
      const days = daysUntil(
        getDueDate(item)
      )

      return (
        days !== null &&
        days >= 0 &&
        days <= 3
      )
    })

  /* ---------------------------------------------------------
     Kritische Verpflichtungen
  --------------------------------------------------------- */

  if (overdueObligations.length > 0) {
    const overdueAmount =
      overdueObligations.reduce(
        (sum, item) =>
          sum + number(item.amount),
        0
      )

    findings.push({
      id: 'overdue-obligations',
      title: '🚨 Überfällige Verpflichtungen',
      message: `${overdueObligations.length} Verpflichtung${
        overdueObligations.length === 1
          ? ''
          : 'en'
      } über insgesamt ${money(
        overdueAmount
      )} sind überfällig. Sortiere diese zuerst nach Wichtigkeit.`,
      type: 'danger',
      priority: 100,
    })
  }

  if (dueSoonObligations.length > 0) {
    const nextItem = [...dueSoonObligations].sort(
      (a: any, b: any) => {
        const aDays =
          daysUntil(getDueDate(a)) ?? 999

        const bDays =
          daysUntil(getDueDate(b)) ?? 999

        return aDays - bDays
      }
    )[0] as any

    const days =
      daysUntil(getDueDate(nextItem))

    const dueText =
      days === 0
        ? 'heute'
        : days === 1
          ? 'morgen'
          : `in ${days} Tagen`

    findings.push({
      id: 'due-soon-obligation',
      title: '📅 Bald fällig',
      message: `${nextItem.title || 'Eine Verpflichtung'} über ${money(
        number(nextItem.amount)
      )} wird ${dueText} fällig.`,
      type: 'warning',
      priority: 90,
    })
  }

  /* ---------------------------------------------------------
     Realistisch verfügbarer Betrag
  --------------------------------------------------------- */

  if (
    balance > 0 &&
    openObligationAmount > 0
  ) {
    findings.push({
      id: 'available-after-obligations',
      title: '💰 Realistisch verfügbar',
      message: `Von deinem aktuellen Überschuss über ${money(
        balance
      )} sind ${money(
        openObligationAmount
      )} für offene Verpflichtungen eingeplant. Danach bleiben ${money(
        availableAfterObligations
      )}.`,
      type:
        availableAfterObligations >= 0
          ? 'info'
          : 'warning',
      priority: 80,
    })
  }

  if (
    availableAfterObligations < 0 &&
    openObligationAmount > 0
  ) {
    findings.push({
      id: 'obligations-exceed-balance',
      title: '⚠️ Verpflichtungen übersteigen Spielraum',
      message: `Nach allen offenen Verpflichtungen fehlen aktuell ${money(
        Math.abs(availableAfterObligations)
      )}. Prüfe zuerst Fristen und wichtige Zahlungen.`,
      type: 'warning',
      priority: 95,
    })
  }

  /* ---------------------------------------------------------
     Cashflow
  --------------------------------------------------------- */

  if (
    totalIncome > 0 &&
    balance > 0
  ) {
    findings.push({
      id: 'positive-cashflow',
      title: '🌱 Positiver Cashflow',
      message: `Deine erfassten Einnahmen liegen aktuell um ${money(
        balance
      )} über deinen Ausgaben.`,
      type: 'good',
      priority: 60,
    })
  }

  if (
    totalExpenses > totalIncome &&
    totalExpenses > 0
  ) {
    findings.push({
      id: 'negative-cashflow',
      title: '📉 Ausgaben liegen über Einnahmen',
      message: `Deine Ausgaben übersteigen die erfassten Einnahmen aktuell um ${money(
        Math.abs(balance)
      )}.`,
      type: 'warning',
      priority: 85,
    })
  }

  /* ---------------------------------------------------------
     Rücklage
  --------------------------------------------------------- */

  if (
    taxReserve > 0 &&
    balance > 0
  ) {
    const afterReserve =
      availableAfterObligations - taxReserve

    findings.push({
      id: 'after-tax-reserve',
      title: '🪙 Nach Rücklage verfügbar',
      message:
        afterReserve >= 0
          ? `Nach offenen Verpflichtungen und der empfohlenen Steuer-Rücklage bleiben voraussichtlich ${money(
              afterReserve
            )} frei verfügbar.`
          : `Offene Verpflichtungen und empfohlene Steuer-Rücklage übersteigen deinen aktuellen Spielraum um ${money(
              Math.abs(afterReserve)
            )}.`,
      type:
        afterReserve >= 0
          ? 'info'
          : 'warning',
      priority: 70,
    })
  }

  /* ---------------------------------------------------------
     Noch zu wenig Daten
  --------------------------------------------------------- */

  if (
    expenses.length === 0 &&
    incomes.length === 0 &&
    obligations.length === 0
  ) {
    findings.push({
      id: 'no-data',
      title: '🌱 Mila lernt dich kennen',
      message:
        'Erfasse deine ersten Einnahmen, Ausgaben oder Verpflichtungen. Danach kann Mila deine finanzielle Lage einordnen.',
      type: 'info',
      priority: 10,
    })
  }

  return findings
    .sort(
      (a, b) =>
        b.priority - a.priority
    )
    .slice(0, 5)
}