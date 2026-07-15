import type { Expense, Income } from './store'

export type MilaForecast = {
  expectedBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  monthlySavings: number
  message: string
}

export function getMilaForecast(
  incomes: Income[] = [],
  expenses: Expense[] = []
): MilaForecast {

  const monthlyIncome = incomes.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  )

  const monthlyExpenses = expenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  )

  const expectedBalance =
    monthlyIncome - monthlyExpenses

  let message = ''

  if (expectedBalance > 1000) {
    message =
      '🌿 Wenn sich deine Einnahmen und Ausgaben ähnlich entwickeln, bleibt dir diesen Monat voraussichtlich ein guter Überschuss.'
  } else if (expectedBalance > 0) {
    message =
      '🙂 Aktuell deutet alles auf einen positiven Monatsabschluss hin.'
  } else {
    message =
      '⚠️ Bei gleichbleibenden Ausgaben könnte dieser Monat negativ enden.'
  }

  return {
    expectedBalance,
    monthlyIncome,
    monthlyExpenses,
    monthlySavings: Math.max(
      0,
      expectedBalance
    ),
    message,
  }
}