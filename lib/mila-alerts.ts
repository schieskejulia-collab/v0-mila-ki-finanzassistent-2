export type MilaAlert = {
  id: string
  type: "danger" | "warning" | "info"
  title: string
  message: string
}

export function getMilaAlerts(
  incomes: any[],
  expenses: any[],
  summary: any
): MilaAlert[] {
  const alerts: MilaAlert[] = []

  if (summary.totalExpenses > summary.totalIncomes) {
    alerts.push({
      id: "liquidity",
      type: "danger",
      title: "🚨 Liquiditätswarnung",
      message:
        "Deine Ausgaben liegen aktuell über deinen Einnahmen."
    })
  }

  if (summary.totalIncomes > 0) {
    const reserve = summary.totalIncomes * 0.3

    alerts.push({
      id: "tax",
      type: "info",
      title: "💰 Steuerrücklage",
      message:
        `Empfohlene Rücklage: ${reserve.toFixed(2)} €`
    })
  }

  return alerts
}