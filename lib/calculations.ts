// --- MONTH SUMMARY ---
export function monthSummary(expenses, incomes, offset = 0) {
  const now = new Date()
  const month = now.getMonth() + offset
  const year = now.getFullYear()

  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === month && d.getFullYear() === year
  })

  const monthIncomes = incomes.filter(i => {
    const d = new Date(i.date)
    return d.getMonth() === month && d.getFullYear() === year
  })

  const income = monthIncomes.reduce((a, i) => a + i.amount, 0)
  const expensesTotal = monthExpenses.reduce((a, e) => a + e.amount, 0)
  const profit = income - expensesTotal

  const openInvoices = monthIncomes.filter(i => i.status === "offen").length
  const taxReserve = Math.max(0, profit * 0.3)

  return {
    income,
    expenses: expensesTotal,
    profit,
    openInvoices,
    taxReserve,
  }
}

// --- CATEGORY BREAKDOWN ---
export function categoryBreakdown(expenses) {
  const map = {}

  expenses.forEach(e => {
    if (!map[e.category]) map[e.category] = 0
    map[e.category] += e.amount
  })

  return Object.entries(map).map(([cat, amount]) => ({
    category: cat,
    amount,
  }))
}

// --- BUDGET STATUS ---
export function budgetStatuses(budgets, expenses) {
  return budgets.map(b => {
    const spent = expenses
      .filter(e => e.category === b.category)
      .reduce((a, e) => a + e.amount, 0)

    return {
      category: b.category,
      limit: b.limit,
      spent,
      level: spent > b.limit ? "over" : "ok",
    }
  })
}

// --- SAVING TIPS ---
export function savingTips(expenses) {
  const tips = []

  const subscriptions = expenses.filter(e =>
    ["software", "abo", "streaming"].includes(e.category)
  )

  if (subscriptions.length > 3) {
    tips.push({
      detail: "Du hast viele laufende Abos – vielleicht kannst du eines kündigen.",
      potential: 20,
    })
  }

  const eatingOut = expenses.filter(e => e.category === "essen")
  if (eatingOut.length > 5) {
    tips.push({
      detail: "Du gehst oft essen – vielleicht 1–2 Mahlzeiten pro Woche selbst kochen?",
      potential: 40,
    })
  }

  return tips
}

// --- FINANCE SCORE ---
export function calculateFinanceScore(summary, incomes, goals) {
  const profit = summary.profit
  const openInvoices = summary.openInvoices
  const taxReserve = summary.taxReserve
  const goalProgress =
    goals.length > 0
      ? goals.reduce((a, g) => a + g.saved / g.target, 0) / goals.length
      : 0

  const profitScore =
    profit > 2000 ? 30 : profit > 0 ? 20 : profit > -500 ? 10 : 0

  const liquidityScore =
    summary.income > summary.expenses ? 20 : 10

  const taxScore =
    taxReserve > 500 ? 20 : taxReserve > 0 ? 10 : 0

  const invoiceScore =
    openInvoices === 0 ? 15 : openInvoices < 3 ? 10 : 5

  const goalScore =
    goalProgress > 0.7 ? 15 : goalProgress > 0.3 ? 10 : 5

  const total = profitScore + liquidityScore + taxScore + invoiceScore + goalScore

  return Math.min(100, Math.max(0, total))
}

// --- FINANCE SCORE STATUS ---
export function financeScoreStatus(score) {
  if (score >= 80) return { label: "exzellent", color: "green" }
  if (score >= 60) return { label: "gut", color: "yellow" }
  if (score >= 40) return { label: "okay", color: "orange" }
  return { label: "handlungsbedarf", color: "red" }
}
