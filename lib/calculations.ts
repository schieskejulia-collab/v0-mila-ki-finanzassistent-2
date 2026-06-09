export function calculateFinanceScore(summary, incomes, goals) {
  const profit = summary.profit
  const openInvoices = summary.openInvoices
  const taxReserve = summary.taxReserve
  const goalProgress =
    goals.length > 0
      ? goals.reduce((a, g) => a + g.saved / g.target, 0) / goals.length
      : 0

  // 1) Profitabilität (0–30 Punkte)
  const profitScore =
    profit > 2000 ? 30 : profit > 0 ? 20 : profit > -500 ? 10 : 0

  // 2) Liquidität (0–20 Punkte)
  const liquidityScore =
    summary.income > summary.expenses ? 20 : 10

  // 3) Steuerplanung (0–20 Punkte)
  const taxScore =
    taxReserve > 500 ? 20 : taxReserve > 0 ? 10 : 0

  // 4) Rechnungsmanagement (0–15 Punkte)
  const invoiceScore =
    openInvoices === 0 ? 15 : openInvoices < 3 ? 10 : 5

  // 5) Zielerreichung (0–15 Punkte)
  const goalScore =
    goalProgress > 0.7 ? 15 : goalProgress > 0.3 ? 10 : 5

  const total = profitScore + liquidityScore + taxScore + invoiceScore + goalScore

  return Math.min(100, Math.max(0, total))
}

export function financeScoreStatus(score: number) {
  if (score >= 80) return { label: "exzellent", color: "green" }
  if (score >= 60) return { label: "gut", color: "yellow" }
  if (score >= 40) return { label: "okay", color: "orange" }
  return { label: "handlungsbedarf", color: "red" }
}
