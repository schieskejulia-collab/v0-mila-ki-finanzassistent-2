export type MilaInsight = {
  id: string
  title: string
  message: string
  type:
    | 'tax'
    | 'warning'
    | 'subscription'
    | 'budget'
    | 'invoice'
    | 'goal'
    | 'family'
    | 'business'
}

function money(value: number) {
  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function getText(entry: any) {
  return `${entry.title || ''} ${entry.vendor || ''} ${entry.client || ''} ${entry.category || ''} ${entry.note || ''}`.toLowerCase()
}

export function getMilaInsights(
  incomes: any[],
  expenses: any[],
  userStatus: string
): MilaInsight[] {
  const insights: MilaInsight[] = []

  const incomeTotal = incomes.reduce((sum, i) => sum + Number(i.amount || 0), 0)
  const expenseTotal = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  const profit = incomeTotal - expenseTotal

  const taxRate =
    userStatus === 'angestellt'
      ? 0.15
      : userStatus === 'kleinunternehmer'
      ? 0.25
      : 0.3

  if (profit > 0) {
    insights.push({
      id: 'tax',
      title: '💰 Steuerrücklage',
      message: `Lege aktuell ca. ${money(profit * taxRate)} zurück. Grundlage ist dein Überschuss von ${money(profit)}.`,
      type: 'tax',
    })
  }

  if (profit < 0) {
    insights.push({
      id: 'liquidity-warning',
      title: '⚠️ Liquidität prüfen',
      message: `Deine Ausgaben liegen aktuell ${money(Math.abs(profit))} über deinen Einnahmen.`,
      type: 'warning',
    })
  }

  const vendors: Record<string, { count: number; total: number }> = {}

  expenses.forEach((e) => {
    const vendor = String(e.vendor || e.title || '').trim()
    if (!vendor) return

    if (!vendors[vendor]) {
      vendors[vendor] = { count: 0, total: 0 }
    }

    vendors[vendor].count += 1
    vendors[vendor].total += Number(e.amount || 0)
  })

  Object.entries(vendors).forEach(([vendor, data]) => {
    if (data.count >= 3) {
      insights.push({
        id: `sub-${vendor}`,
        title: '🔁 Wiederkehrende Ausgabe',
        message: `${vendor} wurde ${data.count}x gebucht (${money(data.total)} gesamt). Prüfe, ob das ein Abo oder Fixkostenblock ist.`,
        type: 'subscription',
      })
    }
  })

  const softwareExpenses = expenses.filter((e) =>
    /hetzner|adobe|figma|canva|openai|chatgpt|notion|slack|software|hosting|domain|tool/.test(
      getText(e)
    )
  )

  if (userStatus === 'freelancer' && softwareExpenses.length >= 2) {
    const total = softwareExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)

    insights.push({
      id: 'freelancer-software',
      title: '💻 Freelancer-Tools',
      message: `Du hast ${softwareExpenses.length} Software-/Tool-Kosten erkannt (${money(total)}). Das sind oft wichtige Betriebsausgaben.`,
      type: 'business',
    })
  }

  if (userStatus === 'freelancer' && profit > 0) {
    insights.push({
      id: 'freelancer-profit',
      title: '📈 Freelancer-Gewinn',
      message: `Dein aktueller Überschuss liegt bei ${money(profit)}. Mila beobachtet daraus Steuer, Rücklagen und laufende Kosten.`,
      type: 'business',
    })
  }

  if (userStatus === 'kleinunternehmer') {
    const remaining = 22000 - incomeTotal

    insights.push({
      id: 'ku-limit',
      title: '⚠️ Kleinunternehmergrenze',
      message:
        remaining > 0
          ? `Bis zur 22.000 € Grenze bleiben dir aktuell noch ${money(remaining)} Umsatz-Spielraum.`
          : 'Du liegst über 22.000 € Umsatz. Prüfe dringend, ob die Kleinunternehmerregelung noch passt.',
      type: 'warning',
    })
  }

  if (userStatus === 'selbstständig' && expenseTotal > incomeTotal * 0.6) {
    insights.push({
      id: 'business-costs',
      title: '📉 Kostenquote prüfen',
      message: 'Deine Ausgaben sind im Verhältnis zu deinen Einnahmen hoch. Prüfe fixe Kosten, Abos und größere Betriebsausgaben.',
      type: 'budget',
    })
  }

  if (userStatus === 'angestellt' && expenseTotal > incomeTotal * 0.8) {
    insights.push({
      id: 'employee-budget',
      title: '💡 Haushaltsbudget',
      message: 'Du verwendest über 80 % deiner Einnahmen. Prüfe Fixkosten, Abos und Sparziel.',
      type: 'budget',
    })
  }

  return insights
}