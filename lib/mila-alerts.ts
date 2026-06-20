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

function getText(entry: any) {
  return `${entry.title || ""} ${entry.vendor || ""} ${entry.client || ""} ${entry.category || ""} ${entry.note || ""}`.toLowerCase()
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
    const taxReserve = balance * 0.3

    alerts.push({
      id: "tax",
      type: "info",
      title: "💰 Steuerrücklage",
      message: `Empfohlene Rücklage: ${money(taxReserve)}`,
    })
  }

  const openIncomes = incomes.filter((income) =>
    ["offen", "pending", "unbezahlt"].includes(
      String(income.status || "").toLowerCase()
    )
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

  expenses.slice(0, 5).forEach((expense, index) => {
    if (expense.hasReceipt === false) {
      alerts.push({
        id: `receipt-${index}`,
        type: "warning",
        title: "📸 Beleg fehlt",
        message: `${expense.title || "Diese Ausgabe"} hat aktuell keinen Beleg hinterlegt.`,
      })
    }
  })

  const vendorMap: Record<string, { count: number; total: number }> = {}

  expenses.forEach((expense) => {
    const vendor = String(
      expense.vendor || expense.client || expense.title || expense.category || ""
    ).trim()

    if (!vendor) return

    if (!vendorMap[vendor]) {
      vendorMap[vendor] = { count: 0, total: 0 }
    }

    vendorMap[vendor].count += 1
    vendorMap[vendor].total += Number(expense.amount || 0)
  })

  Object.entries(vendorMap).forEach(([vendor, data]) => {
    const v = vendor.toLowerCase()

    if (data.count >= 3) {
      alerts.push({
        id: `recurring-${vendor}`,
        type: "info",
        title: "💡 Wiederkehrende Ausgabe",
        message: `${vendor} wurde ${data.count}x gebucht (${money(
          data.total
        )} gesamt). Möchtest du das als Abo markieren?`,
      })
    }

    if (
      data.count >= 3 &&
      (v.includes("pizza") ||
        v.includes("lieferando") ||
        v.includes("dominos"))
    ) {
      alerts.push({
        id: `pattern-${vendor}`,
        type: "info",
        title: "🧠 Verhaltensmuster erkannt",
        message:
          "Du bestellst häufiger Essen. Soll Mila dieses Muster beobachten?",
      })
    }
  })

  const fuelExpenses = expenses.filter((expense) =>
    /aral|shell|esso|jet|star|tankstelle|tanken|kraftstoff|benzin|diesel/.test(
      getText(expense)
    )
  )

  if (fuelExpenses.length >= 2) {
    alerts.push({
      id: "fuel-pattern",
      type: "info",
      title: "⛽ Fahrtkosten erkannt",
      message:
        "Mila sieht mehrere Tank-/Fahrtkosten. Prüfe, ob du Fahrten oder Kilometer sauber dokumentieren solltest.",
    })
  }

  return alerts
}