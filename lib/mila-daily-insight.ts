import type { Expense, Income } from './store'
import type { Obligation } from './mila-obligations'
import type { MilaGoal } from './mila-goals'

export type MilaDailyInsight = {
  id: string
  title: string
  message: string
  type: 'good' | 'info' | 'warning'
  priority: number
}

type DailyInsightInput = {
  expenses?: Expense[]
  incomes?: Income[]
  obligations?: Obligation[]
  goals?: MilaGoal[]
  taxReserve?: number
  availableAfterObligations?: number
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

function daysUntil(value: string) {
  if (!value) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(value)

  if (Number.isNaN(due.getTime())) {
    return null
  }

  due.setHours(0, 0, 0, 0)

  return Math.round(
    (due.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  )
}

export function getMilaDailyInsight({
  expenses = [],
  incomes = [],
  obligations = [],
  goals = [],
  taxReserve = 0,
  availableAfterObligations = 0,
}: DailyInsightInput): MilaDailyInsight | null {
  const openObligations = obligations.filter(
    (item: any) => {
      const status = String(
        item.status || 'offen'
      ).toLowerCase()

      return (
        status !== 'bezahlt' &&
        status !== 'erledigt'
      )
    }
  )

  const overdueObligations =
    openObligations.filter((item: any) => {
      const days = daysUntil(
        getDueDate(item)
      )

      return days !== null && days < 0
    })

  if (overdueObligations.length > 0) {
    const next = overdueObligations[0] as any

    return {
      id: 'overdue-first',
      title: '🚨 Mila hat etwas Wichtiges erkannt',
      message: `${next.title || 'Eine Verpflichtung'} über ${money(
        number(next.amount)
      )} ist überfällig. Heute reicht es, genau diese eine Sache zuerst zu prüfen.`,
      type: 'warning',
      priority: 100,
    }
  }

  const dueSoon = openObligations
    .map((item: any) => ({
      item,
      days: daysUntil(getDueDate(item)),
    }))
    .filter(
      (
        entry
      ): entry is {
        item: any
        days: number
      } =>
        entry.days !== null &&
        entry.days >= 0 &&
        entry.days <= 3
    )
    .sort((a, b) => a.days - b.days)

  if (dueSoon.length > 0) {
    const next = dueSoon[0]

    const dueText =
      next.days === 0
        ? 'heute'
        : next.days === 1
          ? 'morgen'
          : `in ${next.days} Tagen`

    return {
      id: 'due-soon',
      title: '📅 Mila hat etwas erkannt',
      message: `${next.item.title || 'Eine Verpflichtung'} über ${money(
        number(next.item.amount)
      )} wird ${dueText} fällig. Die Zahlung ist bereits in deinem verfügbaren Betrag berücksichtigt.`,
      type: 'info',
      priority: 90,
    }
  }

  const activeGoals = goals
    .filter(
      (goal) =>
        number(goal.target) > 0 &&
        number(goal.saved) <
          number(goal.target)
    )
    .sort((a, b) => {
      const aProgress =
        number(a.saved) /
        number(a.target)

      const bProgress =
        number(b.saved) /
        number(b.target)

      return bProgress - aProgress
    })

  if (
    activeGoals.length > 0 &&
    availableAfterObligations > taxReserve
  ) {
    const goal = activeGoals[0]
    const remaining = Math.max(
      0,
      number(goal.target) -
        number(goal.saved)
    )

    const freelyAvailable = Math.max(
      0,
      availableAfterObligations -
        taxReserve
    )

    const suggestion = Math.min(
      remaining,
      freelyAvailable * 0.1
    )

    if (suggestion >= 5) {
      return {
        id: `goal-${goal.id}`,
        title: '🎯 Mila sieht eine kleine Chance',
        message: `Für „${goal.title}“ fehlen noch ${money(
          remaining
        )}. Eine freiwillige Sparrate von ${money(
          suggestion
        )} wäre heute möglich, ohne deine Steuer-Rücklage anzutasten.`,
        type: 'good',
        priority: 70,
      }
    }
  }

  if (
    taxReserve > 0 &&
    availableAfterObligations >= taxReserve
  ) {
    return {
      id: 'reserve-possible',
      title: '🪙 Mila hat etwas erkannt',
      message: `Deine offenen Verpflichtungen sind berücksichtigt. Du könntest ${money(
        taxReserve
      )} als Steuer-Rücklage einplanen und hättest danach noch ${money(
        availableAfterObligations -
          taxReserve
      )} frei verfügbar.`,
      type: 'good',
      priority: 60,
    }
  }

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

  if (
    totalIncome > 0 &&
    totalExpenses < totalIncome
  ) {
    return {
      id: 'positive-balance',
      title: '🌱 Mila hat etwas Positives erkannt',
      message: `Deine erfassten Einnahmen liegen aktuell um ${money(
        totalIncome - totalExpenses
      )} über deinen Ausgaben. Mit weiteren Daten wird diese Einschätzung genauer.`,
      type: 'good',
      priority: 40,
    }
  }

  if (
    incomes.length === 0 &&
    expenses.length === 0 &&
    obligations.length === 0 &&
    goals.length === 0
  ) {
    return {
      id: 'learning',
      title: '🌸 Mila lernt dich kennen',
      message:
        'Mit deinen ersten Buchungen, Verpflichtungen oder Zielen erkennt Mila automatisch hilfreiche Zusammenhänge.',
      type: 'info',
      priority: 10,
    }
  }

  return null
}