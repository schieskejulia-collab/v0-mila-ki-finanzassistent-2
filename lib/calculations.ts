// Mila zentrale Finanz-Berechnungen

function toNumber(value: any) {
  const parsed = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

export function calculateSummary(incomes: any[] = [], expenses: any[] = []) {
  const totalIncomes = incomes.reduce((sum, item) => sum + toNumber(item.amount), 0)
  const totalExpenses = expenses.reduce((sum, item) => sum + toNumber(item.amount), 0)
  const balance = totalIncomes - totalExpenses

  return {
    totalIncomes,
    totalExpenses,
    balance,
    profit: balance,
  }
}

export function calculatePayments(incomes: any[] = []) {
  const open = incomes.filter((item) => {
    const status = String(item.status || '').toLowerCase()
    return status === 'offen' || status === 'pending' || status === 'unbezahlt'
  })

  const overdue = incomes.filter((item) => {
    const status = String(item.status || '').toLowerCase()
    return status === 'überfällig' || status === 'ueberfaellig' || status === 'overdue'
  })

  return {
    openCount: open.length,
    overdueCount: overdue.length,
    openAmount: open.reduce((sum, item) => sum + toNumber(item.amount), 0),
    overdueAmount: overdue.reduce((sum, item) => sum + toNumber(item.amount), 0),
  }
}

export function calculateReserve({
  balance,
  totalIncomes,
  userStatus,
  vatStatus,
}: any) {
  if (balance <= 0) return 0

  let percentage = 0.1

  if (
    userStatus === 'freiberufler' ||
    userStatus === 'selbststaendig_gewerbe'
  ) {
    percentage = 0.25
  }

  if (userStatus === 'kleinunternehmer') {
    percentage = 0.15
  }

  if (
    vatStatus === 'regelbesteuerung_19' ||
    vatStatus === 'ermaessigt_7'
  ) {
    percentage += 0.1
  }

  return balance * percentage
}

export function calculateFinanceScore({
  balance,
  totalIncomes,
  totalExpenses,
  openCount = 0,
  overdueCount = 0,
}: any) {
  let score = 50

  const hasData = totalIncomes > 0 || totalExpenses > 0

  if (!hasData) return 35

  if (totalIncomes > 0) score += 15

  if (balance > 0) score += 10
  if (balance < 0) score -= 25

  if (totalIncomes > 0) {
    const costRatio = totalExpenses / totalIncomes

    if (costRatio <= 0.4) score += 10
    else if (costRatio <= 0.7) score += 5
    else if (costRatio > 0.9) score -= 15
    else if (costRatio > 0.75) score -= 8
  }

  if (openCount > 0) score -= Math.min(10, openCount * 3)
  if (overdueCount > 0) score -= Math.min(25, overdueCount * 12)

  return Math.max(0, Math.min(100, Math.round(score)))
}

export function calculateTrafficLight(score: number, balance: number) {
  if (score < 45 || balance < 0) {
    return {
      status: '🔴 Erst sortieren',
      level: 'danger',
    }
  }

  if (score < 70) {
    return {
      status: '🟡 Aufbau',
      level: 'warning',
    }
  }

  if (score < 85) {
    return {
      status: '🟢 Stabil',
      level: 'success',
    }
  }

  return {
    status: '🟢 Gute Basis',
    level: 'success',
  }
}