export type MilaFinding = {
  id: string
  title: string
  message: string
  severity: "low" | "medium" | "high"
  category:
    | "cashflow"
    | "behavior"
    | "pattern"
    | "risk"
    | "opportunity"
    | "category"
    | "trend"
}

function money(value: number) {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  })
}

function number(value: any) {
  const raw = String(value ?? "").replace(",", ".")
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

function getText(entry: any) {
  return `${entry.title || ""} ${entry.vendor || ""} ${entry.client || ""} ${
    entry.category || ""
  } ${entry.note || ""}`.toLowerCase()
}

export function getMilaFindings(
  incomes: any[],
  expenses: any[],
  summary: any
): MilaFinding[] {
  const findings: MilaFinding[] = []

  const totalIncomes = number(summary?.totalIncomes)
  const totalExpenses = number(summary?.totalExpenses)
  const balance = totalIncomes - totalExpenses

  // -----------------------------------------
  // 1) CASHFLOW & LIQUIDITÄT
  // -----------------------------------------
  if (balance < 0) {
    findings.push({
      id: "cf-negative",
      title: "🔴 Negativer Cashflow",
      message: `Deine Ausgaben übersteigen deine Einnahmen um ${money(
        Math.abs(balance)
      )}. Prüfe Fixkosten, Abos und offene Rechnungen.`,
      severity: "high",
      category: "cashflow",
    })
  }

  if (balance > 0 && balance < totalIncomes * 0.2) {
    findings.push({
      id: "cf-tight",
      title: "🟠 Enger Spielraum",
      message:
        "Dein Cashflow ist positiv, aber knapp. Kleine Schwankungen können schnell zu Engpässen führen.",
      severity: "medium",
      category: "cashflow",
    })
  }

  if (balance > totalIncomes * 0.3) {
    findings.push({
      id: "cf-healthy",
      title: "🟢 Stabiler Cashflow",
      message:
        "Du hast einen gesunden Überschuss. Nutze ihn für Rücklagen, Investitionen oder offene Verpflichtungen.",
      severity: "low",
      category: "cashflow",
    })
  }

  // -----------------------------------------
  // 2) KOSTENMUSTER & VERHALTEN
  // -----------------------------------------
  const foodPattern = expenses.filter((e) =>
    /pizza|lieferando|essen|imbiss|dominos/.test(getText(e))
  )

  if (foodPattern.length >= 3) {
    findings.push({
      id: "pattern-food",
      title: "🍕 Muster: Häufige Essensbestellungen",
      message:
        "Mila erkennt ein Muster bei Essensbestellungen. Wenn du möchtest, beobachtet Mila dieses Verhalten weiter.",
      severity: "medium",
      category: "behavior",
    })
  }

  const fuelPattern = expenses.filter((e) =>
    /aral|shell|esso|jet|star|tankstelle|tanken|kraftstoff/.test(getText(e))
  )

  if (fuelPattern.length >= 2) {
    findings.push({
      id: "pattern-fuel",
      title: "⛽ Fahrtkosten-Muster",
      message:
        "Mehrere Tankvorgänge erkannt. Prüfe, ob du Fahrten oder Kilometer dokumentieren möchtest.",
      severity: "low",
      category: "pattern",
    })
  }

  // -----------------------------------------
  // 3) KATEGORIEN & SCHWERPUNKTE
  // -----------------------------------------
  const softwareCosts = expenses.filter((e) =>
    /adobe|figma|canva|openai|notion|slack|saas|software|hosting|domain/.test(
      getText(e)
    )
  )

  if (softwareCosts.length >= 2) {
    const total = softwareCosts.reduce((s, e) => s + number(e.amount), 0)

    findings.push({
      id: "cat-software",
      title: "💻 Schwerpunkt: Software & Tools",
      message: `Du investierst regelmäßig in Software. Gesamt: ${money(
        total
      )}. Prüfe, ob alle Tools aktiv genutzt werden.`,
      severity: "medium",
      category: "category",
    })
  }

  // -----------------------------------------
  // 4) TRENDS & ENTWICKLUNGEN
  // -----------------------------------------
  const last3 = expenses.slice(-3)
  const rising = last3.every(
    (e, i, arr) => i === 0 || number(e.amount) >= number(arr[i - 1].amount)
  )

  if (last3.length === 3 && rising) {
    findings.push({
      id: "trend-rising-expenses",
      title: "📈 Trend: Steigende Ausgaben",
      message:
        "Die letzten drei Ausgaben waren jeweils höher als die vorherigen. Mila beobachtet diese Entwicklung.",
      severity: "medium",
      category: "trend",
    })
  }

  // -----------------------------------------
  // 5) CHANCEN & POTENZIALE
  // -----------------------------------------
  if (balance > 0 && totalExpenses < totalIncomes * 0.5) {
    findings.push({
      id: "opportunity-invest",
      title: "✨ Potenzial: Investitionen möglich",
      message:
        "Du hast einen guten Überschuss und eine niedrige Kostenquote. Vielleicht ist jetzt ein guter Zeitpunkt für Investitionen.",
      severity: "low",
      category: "opportunity",
    })
  }
  // -----------------------------------------
  // 6) OFFENE & ÜBERFÄLLIGE ZAHLUNGEN
  // -----------------------------------------
  const openIncomes = incomes.filter((i) =>
    ["offen", "open", "unbezahlt"].includes(String(i.status || "").toLowerCase())
  )

  const overdueIncomes = incomes.filter((i) =>
    ["überfällig", "overdue", "mahnung"].includes(String(i.status || "").toLowerCase())
  )

  const openIncomeTotal = openIncomes.reduce((s, i) => s + number(i.amount), 0)
  const overdueIncomeTotal = overdueIncomes.reduce((s, i) => s + number(i.amount), 0)

  if (openIncomes.length >= 1) {
    findings.push({
      id: "income-open",
      title: "🟡 Offene Einnahmen",
      message: `Du hast ${openIncomes.length} offene Zahlung(en) über ${money(
        openIncomeTotal
      )}. Prüfe heute, was davon schon bezahlt wurde.`,
      severity: "medium",
      category: "cashflow",
    })
  }

  if (overdueIncomes.length >= 1) {
    findings.push({
      id: "income-overdue",
      title: "🚨 Überfällige Zahlung",
      message: `${overdueIncomes.length} Zahlung(en) über ${money(
        overdueIncomeTotal
      )} sind überfällig. Das sollte heute deine höchste Finanz-Priorität sein.`,
      severity: "high",
      category: "risk",
    })
  }
  return findings.slice(0, 10)
}
