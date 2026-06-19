export type MilaAlert = {
  id: string
  type: "danger" | "warning" | "info"
  title: string
  message: string
}

function money(value: number) {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  })
}

export function getMilaAlerts(
  incomes: any[],
  expenses: any[],
  summary: any
): MilaAlert[] {
  const alerts: MilaAlert[] = []

  const totalIncomes = summary?.totalIncomes || 0
  const totalExpenses = summary?.totalExpenses || 0
  const balance = totalIncomes - totalExpenses

  if (totalExpenses > totalIncomes) {
    alerts.push({
      id: "liquidity",
      type: "danger",
      title: "🚨 Liquiditätswarnung",
      message: "Deine Ausgaben liegen aktuell über deinen Einnahmen.",
    })
  }

  if (balance > 0) {
    alerts.push({
      id: "tax",
      type: "info",
      title: "💰 Steuerrücklage",
      const taxReserve = balance > 0 ? balance * 0.3 : 0
message: `Empfohlene Rücklage: ${money(taxReserve)}`
  }

  const openIncomes = incomes.filter(
    (income) =>
      income.status === "offen" ||
      income.status === "pending" ||
      income.status === "unbezahlt"
  )

  openIncomes.forEach((income, index) => {
    alerts.push({
      id: `open-income-${index}`,
      type: "warning",
      title: "📄 Offene Rechnung",
      message: `${income.title || "Rechnung"} über ${money(
        Number(income.amount || 0)
      )} ist noch offen.`,
    })
  })

  const vendorMap: Record<string, { count: number; total: number }> = {}

  expenses.forEach((expense) => {
    const vendor =
      expense.vendor || expense.client || expense.title || expense.category

    if (!vendor) return

    if (!vendorMap[vendor]) {
      vendorMap[vendor] = { count: 0, total: 0 }
    }
expenses.forEach((expense, index) => {
  if (!expense.hasReceipt) {
    alerts.push({
      id: `receipt-${index}`,
      type: "warning",
      title: "📸 Beleg fehlt",
      message: `${expense.title || "Diese Ausgabe"} hat aktuell keinen Beleg hinterlegt.`,
    })
  }
    vendorMap[vendor].count += 1
    vendorMap[vendor].total += Number(expense.amount || 0)
  })

  Object.entries(vendorMap).forEach(([vendor, data]) => {
    if (data.count >= 2) {
      alerts.push({
        id: `recurring-${vendor}`,
        type: "info",
        title: "💡 Wiederkehrende Ausgabe",
        message: `${vendor} wurde ${data.count}x gebucht (${money(
          data.total
        )} gesamt). Möchtest du das als Abo markieren?`,
      })
    }
  })

  return alerts
}