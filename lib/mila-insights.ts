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

export function getMilaInsights(
  incomes: any[],
  expenses: any[],
  userStatus: string
): MilaInsight[] {
  const insights: MilaInsight[] = []

  const incomeTotal = incomes.reduce(
    (sum, i) => sum + Number(i.amount || 0),
    0
  )

  const expenseTotal = expenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  )

  const profit = incomeTotal - expenseTotal

  // Steuer-Rücklage
  if (profit > 0) {
    const tax = profit * 0.3

    insights.push({
      id: 'tax',
      title: '💰 Steuerrücklage',
      message: `Empfohlene Rücklage: ${tax.toFixed(
        2
      )} €`,
      type: 'tax',
    })
  }

  // Liquiditätswarnung
  if (profit < 0) {
    insights.push({
      id: 'warning',
      title: '⚠️ Liquidität',
      message:
        'Deine Ausgaben sind aktuell höher als deine Einnahmen.',
      type: 'warning',
    })
  }

  // Wiederkehrende Kosten erkennen
  const vendors: Record<string, number> = {}

  expenses.forEach((e) => {
    const vendor =
      e.vendor ||
      e.title ||
      ''

    if (!vendor) return

    vendors[vendor] =
      (vendors[vendor] || 0) + 1
  })

  Object.entries(vendors).forEach(
    ([vendor, count]) => {
      if (count >= 3) {
        const total = expenses
          .filter(
            (e) =>
              (e.vendor ||
                e.title) === vendor
          )
          .reduce(
            (sum, e) =>
              sum +
              Number(e.amount || 0),
            0
          )

        insights.push({
          id: `sub-${vendor}`,
          title:
            '💡 Wiederkehrende Ausgabe',
          message: `${vendor} wurde ${count}x gebucht (${total.toFixed(
            2
          )} € gesamt). Möchtest du das als Abo markieren?`,
          type: 'subscription',
        })
      }
    }
  )

  // Kleinunternehmer
  if (
    userStatus ===
      'kleinunternehmer' &&
    incomeTotal >= 22000
  ) {
    insights.push({
      id: 'ku',
      title:
        '⚠️ Kleinunternehmergrenze',
      message:
        'Du näherst dich der Umsatzgrenze.',
      type: 'warning',
    })
  }

  // Freelancer
  if (
    userStatus ===
      'freelancer' &&
    profit > 1000
  ) {
    insights.push({
      id: 'freelancer',
      title:
        '🚀 Freelancer-Entwicklung',
      message:
        'Dein Geschäft entwickelt sich positiv.',
      type: 'business',
    })
  }

  // Angestellte
  if (
    userStatus ===
      'angestellt' &&
    expenseTotal >
      incomeTotal * 0.8
  ) {
    insights.push({
      id: 'employee',
      title:
        '💡 Sparpotenzial',
      message:
        'Du verwendest über 80 % deines Einkommens.',
      type: 'budget',
    })
  }

  // Familienmodus
  if (
    userStatus ===
      'familie'
  ) {
    insights.push({
      id: 'family',
      title:
        '👨‍👩‍👧‍👦 Familienbudget',
      message:
        'Prüfe deine Rücklagen für Kinder- und Haushaltskosten.',
      type: 'family',
    })
  }

  return insights
}