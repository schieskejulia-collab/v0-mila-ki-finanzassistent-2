import type { Expense, Income } from "./store"
import type { Obligation } from "./mila-obligations"

export type MilaPattern = {
  id: string
  title: string
  description: string
  severity: "good" | "info" | "warning"
  confidence: number
}

function money(value: number) {
  return Number(value || 0).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  })
}

export function getMilaPatterns(
  expenses: Expense[] = [],
  incomes: Income[] = [],
  obligations: Obligation[] = []
): MilaPattern[] {
  const patterns: MilaPattern[] = []

  const totalExpenses = expenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  )

  const totalIncome = incomes.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  )

  const balance = totalIncome - totalExpenses

  /* ------------------------------
     Liquidität
  ------------------------------ */

  if (balance > 1000) {
    patterns.push({
      id: "strong-liquidity",
      title: "🟢 Gute Liquidität",
      description: `Aktuell bleibt ein Überschuss von ${money(
        balance
      )}. Das gibt dir finanziellen Spielraum.`,
      severity: "good",
      confidence: 100,
    })
  } else if (balance < 0) {
    patterns.push({
      id: "negative-liquidity",
      title: "🔴 Negativer Cashflow",
      description:
        "Momentan übersteigen deine Ausgaben deine Einnahmen. Mila empfiehlt einen Blick auf die größten Kosten.",
      severity: "warning",
      confidence: 100,
    })
  }

  /* ------------------------------
     Wiederkehrende Händler
  ------------------------------ */

  const merchantCounter: Record<string, number> = {}

  expenses.forEach((expense) => {
    const merchant =
      expense.vendor?.trim() ||
      expense.title?.trim()

    if (!merchant) return

    merchantCounter[merchant] =
      (merchantCounter[merchant] || 0) + 1
  })

  Object.entries(merchantCounter).forEach(([merchant, count]) => {
    if (count >= 3) {
      patterns.push({
        id: `merchant-${merchant}`,
        title: "🔁 Wiederkehrende Ausgaben",
        description: `${merchant} taucht bereits ${count} Mal auf. Prüfe, ob daraus ein regelmäßiger Vertrag oder ein Abo geworden ist.`,
        severity: "info",
        confidence: 90,
      })
    }
  })

  /* ------------------------------
     Software
  ------------------------------ */

  const softwareExpenses = expenses.filter(
    (item) =>
      item.category === "software" ||
      item.category === "ki" ||
      item.category === "tools"
  )

  if (softwareExpenses.length >= 3) {
    const total = softwareExpenses.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    )

    patterns.push({
      id: "software-costs",
      title: "💻 Software & KI",
      description: `${softwareExpenses.length} Software- oder KI-Kosten mit insgesamt ${money(
        total
      )} erkannt.`,
      severity: "info",
      confidence: 95,
    })
  }

  /* ------------------------------
     Offene Verpflichtungen
  ------------------------------ */

  const openObligations = obligations.filter(
    (item) =>
      item.status !== "bezahlt" &&
      item.status !== "erledigt"
  )

  if (openObligations.length >= 5) {
    patterns.push({
      id: "many-obligations",
      title: "📅 Viele offene Verpflichtungen",
      description: `${openObligations.length} Verpflichtungen sind aktuell noch offen.`,
      severity: "warning",
      confidence: 100,
    })
  }

  /* ------------------------------
     Einnahmen
  ------------------------------ */

  if (incomes.length >= 5) {
    patterns.push({
      id: "stable-income",
      title: "💶 Regelmäßige Einnahmen",
      description:
        "Mila erkennt mehrere Einnahmen. Das spricht für einen regelmäßigen Geldfluss.",
      severity: "good",
      confidence: 80,
    })
  }

  /* ------------------------------
     Positive Entwicklung
  ------------------------------ */

  if (
    totalIncome > 0 &&
    totalExpenses < totalIncome * 0.7
  ) {
    patterns.push({
      id: "healthy-spending",
      title: "🌱 Gesundes Ausgabeverhalten",
      description:
        "Deine Ausgaben liegen deutlich unter deinen Einnahmen. Das schafft finanziellen Spielraum.",
      severity: "good",
      confidence: 85,
    })
  }

  return patterns.sort((a, b) => {
    const order = {
      warning: 0,
      info: 1,
      good: 2,
    }

    return order[a.severity] - order[b.severity]
  })
}