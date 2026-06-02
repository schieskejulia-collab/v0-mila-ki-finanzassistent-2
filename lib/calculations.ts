import type { Expense, Income, Budget, CategoryId, Goal } from './types'
import { CATEGORIES } from './types'

function isInMonth(iso: string, offset: number): boolean {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return false
  const now = new Date()
  const ref = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

export function expensesForMonth(expenses: Expense[], offset = 0): Expense[] {
  return expenses.filter((e) => isInMonth(e.date, offset))
}

export function incomesForMonth(incomes: Income[], offset = 0): Income[] {
  return incomes.filter((i) => isInMonth(i.date, offset))
}

export function sum<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((acc, item) => acc + (pick(item) || 0), 0)
}

export interface MonthSummary {
  income: number
  expenses: number
  profit: number
  taxReserve: number
  liquidity: number
  openInvoices: number
  vatBalance: number
}

export function monthSummary(
  expenses: Expense[],
  incomes: Income[],
  offset = 0,
): MonthSummary {
  const monthExpenses = expensesForMonth(expenses, offset)
  const monthIncomes = incomesForMonth(incomes, offset)
  const expensesTotal = sum(monthExpenses, (e) => e.amount)
  const incomePaid = sum(
    monthIncomes.filter((i) => i.status === 'bezahlt'),
    (i) => i.amount,
  )
  const incomeAll = sum(monthIncomes, (i) => i.amount)
  const profit = incomeAll - expensesTotal
  const taxReserve = Math.max(0, profit * 0.3)
  const openInvoices = sum(
    monthIncomes.filter((i) => i.status === 'offen'),
    (i) => i.amount,
  )
  const vatCollected = sum(monthIncomes, (i) => i.vat)
  const vatPaid = sum(monthExpenses, (e) => e.vat)
  return {
    income: incomeAll,
    expenses: expensesTotal,
    profit,
    taxReserve,
    liquidity: incomePaid - expensesTotal - taxReserve,
    openInvoices,
    vatBalance: vatCollected - vatPaid,
  }
}

export interface CategoryBreakdown {
  category: CategoryId
  label: string
  color: string
  current: number
  previous: number
  change: number // percent
}

export function categoryBreakdown(expenses: Expense[]): CategoryBreakdown[] {
  const current = expensesForMonth(expenses, 0)
  const previous = expensesForMonth(expenses, -1)
  return (Object.keys(CATEGORIES) as CategoryId[])
    .map((cat) => {
      const c = sum(current.filter((e) => e.category === cat), (e) => e.amount)
      const p = sum(previous.filter((e) => e.category === cat), (e) => e.amount)
      const change = p === 0 ? (c === 0 ? 0 : 100) : ((c - p) / p) * 100
      return {
        category: cat,
        label: CATEGORIES[cat].label,
        color: CATEGORIES[cat].color,
        current: c,
        previous: p,
        change,
      }
    })
    .filter((b) => b.current > 0 || b.previous > 0)
    .sort((a, b) => b.current - a.current)
}

export interface BudgetStatus {
  budget: Budget
  spent: number
  pct: number
  level: 'ok' | 'warn' | 'over'
  label: string
}

export function budgetStatuses(
  budgets: Budget[],
  expenses: Expense[],
): BudgetStatus[] {
  const current = expensesForMonth(expenses, 0)
  return budgets
    .map((budget) => {
      const spent = sum(
        current.filter((e) => e.category === budget.category),
        (e) => e.amount,
      )
      const pct = budget.limit > 0 ? (spent / budget.limit) * 100 : 0
      let level: BudgetStatus['level'] = 'ok'
      if (pct >= 100) level = 'over'
      else if (pct >= budget.warnThreshold) level = 'warn'
      return { budget, spent, pct, level, label: CATEGORIES[budget.category].label }
    })
    .sort((a, b) => b.pct - a.pct)
}

export interface SavingTip {
  id: string
  title: string
  detail: string
  potential: number
}

export function savingTips(expenses: Expense[]): SavingTip[] {
  const current = expensesForMonth(expenses, 0)
  const tips: SavingTip[] = []

  const software = current.filter((e) => e.category === 'software')
  const softwareTotal = sum(software, (e) => e.amount)
  if (software.length >= 2) {
    tips.push({
      id: 'software',
      title: 'Software-Abos bündeln',
      detail: `Du zahlst aktuell ${software.length} Software-Abos (${Math.round(
        softwareTotal,
      )} €/Monat). Manche Tools überschneiden sich – ein gemeinsamer Plan könnte etwas sparen.`,
      potential: Math.round(softwareTotal * 0.25),
    })
  }

  const marketing = sum(
    current.filter((e) => e.category === 'marketing'),
    (e) => e.amount,
  )
  if (marketing > 200) {
    tips.push({
      id: 'marketing',
      title: 'Marketing gezielter einsetzen',
      detail: `Deine Marketingausgaben liegen bei ${Math.round(
        marketing,
      )} €. Wenn du auf die zwei stärksten Kanäle fokussierst, bleibt mehr für deine Ziele.`,
      potential: Math.round(marketing * 0.2),
    })
  }

  const noReceipt = current.filter((e) => !e.hasReceipt)
  if (noReceipt.length > 0) {
    tips.push({
      id: 'receipts',
      title: 'Belege für die Steuer sichern',
      detail: `${noReceipt.length} Ausgabe(n) haben noch keinen Beleg. Nachreichen lohnt sich – das senkt deine Steuerlast.`,
      potential: Math.round(sum(noReceipt, (e) => e.vat)),
    })
  }

  return tips
}

export function goalForecastMonths(goal: Goal): number {
  const remaining = goal.target - goal.saved
  if (remaining <= 0) return 0
  if (goal.monthlyContribution <= 0) return Infinity
  return Math.ceil(remaining / goal.monthlyContribution)
}

export type FinanceMood = 'entspannt' | 'stabil' | 'angespannt'

export function financeMood(summary: MonthSummary): FinanceMood {
  if (summary.liquidity < 0) return 'angespannt'
  if (summary.profit <= 0) return 'angespannt'
  const ratio = summary.expenses / Math.max(1, summary.income)
  if (ratio < 0.6 && summary.liquidity > 500) return 'entspannt'
  return 'stabil'
}

// Simple linear projection for the rest of the current month.
export function projectMonthProfit(
  expenses: Expense[],
  incomes: Income[],
): { projectedProfit: number; projectedTax: number } {
  const now = new Date()
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const factor = daysInMonth / Math.max(1, dayOfMonth)
  const s = monthSummary(expenses, incomes, 0)
  const projectedProfit = Math.round(s.profit * Math.min(factor, 1.6))
  return {
    projectedProfit,
    projectedTax: Math.round(Math.max(0, projectedProfit) * 0.3),
  }
}
