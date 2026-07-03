// Mila zentrale Finanz-Berechnungen

function toNumber(value: any) {
  const parsed = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

export function calculateSummary(incomes: any[] = [], expenses: any[] = []) {
  const totalIncomes = incomes.reduce(
    (sum, item) => sum + toNumber(item.amount),
    0
  )

  const totalExpenses = expenses.reduce(
    (sum, item) => sum + toNumber(item.amount),
    0
  )

  const balance = totalIncomes - totalExpenses

  return {
    totalIncomes,
    totalExpenses,
    balance,
    profit: balance,
  }
}


// -----------------------------
// OFFENE ZAHLUNGEN
// -----------------------------

export function calculatePayments(incomes: any[] = []) {
  const open = incomes.filter((item) => {
    const status = String(item.status || '').toLowerCase()
    return status === 'offen' || status === 'pending'
  })

  const overdue = incomes.filter((item) => {
    const status = String(item.status || '').toLowerCase()
    return (
      status === 'überfällig' ||
      status === 'ueberfaellig'
    )
  })

  return {
    openCount: open.length,
    overdueCount: overdue.length,

    openAmount: open.reduce(
      (sum, item) => sum + toNumber(item.amount),
      0
    ),

    overdueAmount: overdue.reduce(
      (sum, item) => sum + toNumber(item.amount),
      0
    ),
  }
}


// -----------------------------
// RÜCKLAGE
// -----------------------------

export function calculateReserve(
  balance: number,
  rate = 0.3
) {
  if (balance <= 0) return 0

  return balance * rate
}


// -----------------------------
// FINANZ SCORE
// -----------------------------

export function calculateFinanceScore({
  balance,
  totalIncomes,
  totalExpenses,
  openCount = 0,
  overdueCount = 0,
}: any) {
  let score = 75

  if (balance < 0) score -= 35

  if (
    totalIncomes > 0 &&
    totalExpenses / totalIncomes > 0.8
  ) {
    score -= 15
  }

  if (
    totalIncomes > 0 &&
    totalExpenses / totalIncomes < 0.4
  ) {
    score += 10
  }

  if (balance > 1000) score += 10

  if (openCount > 3) score -= 5

  if (overdueCount > 0) score -= 20

  return Math.max(0, Math.min(100, score))
}


// -----------------------------
// AMPEL
// -----------------------------

export function calculateTrafficLight(score: number, balance: number) {
  if (score < 50 || balance < 0) {
    return {
      status: '🔴 Liquiditätsrisiko',
      level: 'danger',
    }
  }

  if (score < 75) {
    return {
      status: '🟡 Beobachten',
      level: 'warning',
    }
  }

  return {
    status: '🟢 Alles gut',
    level: 'success',
  }
}
