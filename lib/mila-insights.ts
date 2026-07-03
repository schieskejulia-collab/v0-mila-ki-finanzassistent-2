import { getEntryCategory } from './mila-classifier'
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

function number(value: any) {
  const raw = String(value ?? '').replace(',', '.')
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

function getText(entry: any) {
  return `${entry.title || ''} ${entry.vendor || ''} ${entry.client || ''} ${
    entry.category || ''
  } ${entry.note || ''}`.toLowerCase()
}

function normalizeName(value: any) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function taxRateForStatus(userStatus: string) {
  if (userStatus === 'angestellt') return 0.1
  if (userStatus === 'kleinunternehmer') return 0.25
  return 0.3
}

function industryLabel(industry?: string) {
  const labels: Record<string, string> = {
    webdesigner: 'Webdesigner',
    fotograf: 'Fotograf',
    coach: 'Coach',
    handwerker: 'Handwerker',
    restaurant: 'Gastronomie',
    ecommerce: 'E-Commerce',
    berater: 'Berater',
    sonstiges: 'deiner Branche',
  }

  return labels[industry || 'sonstiges'] || 'deiner Branche'
}

export function getMilaInsights(
  incomes: any[],
  expenses: any[],
  userStatus: string,
  industry?: string
): MilaInsight[] {
  const insights: MilaInsight[] = []

  const incomeTotal = incomes.reduce((sum, i) => sum + number(i.amount), 0)
  const expenseTotal = expenses.reduce((sum, e) => sum + number(e.amount), 0)
  const profit = incomeTotal - expenseTotal
  const taxRate = taxRateForStatus(userStatus)
  const taxReserve = profit > 0 ? profit * taxRate : 0
  const availableAfterReserve = profit - taxReserve
  const costRatio = incomeTotal > 0 ? expenseTotal / incomeTotal : 0

  if (incomeTotal === 0 && expenseTotal === 0) {
    return [
      {
        id: 'start-empty',
        title: '🌱 Mila ist bereit',
        message:
          'Erfasse deine erste Einnahme oder Ausgabe. Danach kann Mila dir Rücklagen, Muster und Warnungen anzeigen.',
        type: 'goal',
      },
    ]
  }

  if (profit > 0) {
    insights.push({
      id: 'tax-reserve',
      title: '💰 Steuerrücklage',
      message: `Lege ungefähr ${money(
        taxReserve
      )} zurück. Danach bleiben dir rechnerisch etwa ${money(
        availableAfterReserve
      )} frei verfügbar.`,
      type: 'tax',
    })
  }

  if (profit < 0) {
    insights.push({
      id: 'liquidity-warning',
      title: '⚠️ Liquidität prüfen',
      message: `Deine Ausgaben liegen aktuell ${money(
        Math.abs(profit)
      )} über deinen Einnahmen. Prüfe zuerst Fixkosten, offene Rechnungen und doppelte Buchungen.`,
      type: 'warning',
    })
  }

  if (incomeTotal > 0 && costRatio >= 0.8) {
    insights.push({
      id: 'high-cost-ratio',
      title: '📉 Kostenquote hoch',
      message: `Du verwendest aktuell rund ${Math.round(
        costRatio * 100
      )}% deiner Einnahmen für Ausgaben. Mila empfiehlt, Abos, Fixkosten und größere Posten zu prüfen.`,
      type: 'budget',
    })
  }

  if (incomeTotal > 0 && costRatio <= 0.35 && profit > 0) {
    insights.push({
      id: 'healthy-margin',
      title: '🟢 Solider Spielraum',
      message:
        'Deine Kostenquote wirkt aktuell gesund. Nutze den Überschuss bewusst für Rücklagen, Investitionen oder offene Verpflichtungen.',
      type: 'budget',
    })
  }

  const openIncomes = incomes.filter((income) => {
    const status = String(income.status || '').toLowerCase()
    return status === 'offen' || status === 'pending' || !status
  })

  if (openIncomes.length > 0) {
    const openTotal = openIncomes.reduce((sum, i) => sum + number(i.amount), 0)

    insights.push({
      id: 'open-invoices',
      title: '🧾 Offene Einnahmen',
      message: `Du hast ${openIncomes.length} offene Einnahme${
        openIncomes.length === 1 ? '' : 'n'
      } im Wert von ${money(
        openTotal
      )}. Prüfe, ob Zahlung oder Erinnerung fällig ist.`,
      type: 'invoice',
    })
  }

  const vendors: Record<string, { label: string; count: number; total: number }> =
    {}

  expenses.forEach((expense) => {
    const label = String(expense.vendor || expense.title || '').trim()
    const key = normalizeName(label)
    if (!key) return

    if (!vendors[key]) vendors[key] = { label, count: 0, total: 0 }

    vendors[key].count += 1
    vendors[key].total += number(expense.amount)
  })

  Object.entries(vendors).forEach(([key, data]) => {
    if (data.count >= 2) {
      const monthlyEstimate = data.total / data.count

      insights.push({
        id: `sub-${key}`,
        title: '🔁 Wiederkehrende Ausgabe',
        message: `${data.label} wurde ${data.count}x erkannt (${money(
          data.total
        )} gesamt). Wenn das monatlich läuft, sind das ungefähr ${money(
          monthlyEstimate
        )} pro Monat.`,
        type: 'subscription',
      })
    }
  })

  const softwareExpenses = expenses.filter(
    (expense) => getEntryCategory(expense) === 'software'
  )

  if (
    ['freelancer', 'selbstständig', 'selbststaendig', 'kleinunternehmer'].includes(
      userStatus
    ) &&
    softwareExpenses.length >= 1
  ) {
    const total = softwareExpenses.reduce((sum, e) => sum + number(e.amount), 0)

    insights.push({
      id: 'software-tools',
      title: '💻 Software & Tools',
      message: `Mila hat ${softwareExpenses.length} Software-/Tool-Kosten erkannt (${money(
        total
      )}). Prüfe regelmäßig, ob du alle Tools wirklich nutzt.`,
      type: 'business',
    })
  }

  const privateExpenses = expenses.filter(
    (expense) => getEntryCategory(expense) === 'privat'
  )

  if (privateExpenses.length > 0) {
    const total = privateExpenses.reduce((sum, e) => sum + number(e.amount), 0)

    insights.push({
      id: 'private-expenses',
      title: '🔒 Private Ausgaben erkannt',
      message: `${privateExpenses.length} Ausgabe${
        privateExpenses.length === 1 ? '' : 'n'
      } wirken privat (${money(
        total
      )}). Mila kann sie markieren, damit deine geschäftliche Auswertung sauberer bleibt.`,
      type: 'budget',
    })
  }

  if (userStatus === 'angestellt' && expenseTotal > 0) {
    insights.push({
      id: 'employee-expenses',
      title: '💡 Ausgaben im Blick',
      message:
        'Auch als Angestellte:r lohnt sich Überblick. Prüfe Arbeitsmittel, Weiterbildung, Fahrtkosten und wiederkehrende Kosten.',
      type: 'budget',
    })
  }

  if (userStatus === 'freelancer' && profit > 0) {
    insights.push({
      id: 'freelancer-profit',
      title: '📈 Freelancer-Gewinn',
      message: `Dein aktueller Überschuss liegt bei ${money(
        profit
      )}. Mila beobachtet daraus Rücklagen, Kostenquote und mögliche Engpässe.`,
      type: 'business',
    })
  }

  if (userStatus === 'kleinunternehmer') {
    const limit = 22000
    const remaining = limit - incomeTotal

    insights.push({
      id: 'ku-limit',
      title: '⚠️ Kleinunternehmergrenze',
      message:
        remaining > 0
          ? `Bis zur 22.000 €-Grenze bleiben dir aktuell noch ${money(
              remaining
            )} Umsatz-Spielraum.`
          : 'Du liegst über 22.000 € Umsatz. Prüfe unbedingt, ob die Kleinunternehmerregelung noch passt.',
      type: 'warning',
    })
  }

  const industryMessages: Record<string, string> = {
    webdesigner:
      'Achte besonders auf Domains, Hosting, Design-Tools, KI-Tools, Projektmargen und wiederkehrende Softwarekosten.',
    fotograf:
      'Dokumentiere Kamera, Objektive, Speicherkarten, Adobe, Fahrtkosten und Shooting-Ausgaben sauber.',
    coach:
      'Behalte Weiterbildungen, Videotools, Plattformen, Marketing und Räume im Blick.',
    handwerker:
      'Werkzeug, Material, Fahrzeugkosten, Fahrtkosten und größere Anschaffungen sind zentrale Kostenblöcke.',
    restaurant:
      'Wareneinkauf, Lieferkosten, Energie, Personal und Zahlungsgebühren sollten regelmäßig geprüft werden.',
    ecommerce:
      'Versand, Werbung, Shopify, Zahlungsgebühren, Retouren und Einkaufspreise beeinflussen deine Marge stark.',
    berater:
      'Reisekosten, Software, Weiterbildung, Projektmargen und offene Rechnungen sind hier besonders wichtig.',
    sonstiges:
      'Mila achtet auf wiederkehrende Kosten, Rücklagen, Einnahmen und größere Ausgabenmuster.',
  }

  insights.push({
    id: `industry-${industry || 'sonstiges'}`,
    title: `🎯 Fokus ${industryLabel(industry)}`,
    message:
      industryMessages[industry || 'sonstiges'] || industryMessages.sonstiges,
    type: 'business',
  })

  return insights.slice(0, 8)
}