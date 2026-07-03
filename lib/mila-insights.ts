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

function normalizeName(value: any) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function taxRateForStatus(userStatus: string) {
  if (userStatus === 'angestellt') return 0.1
  if (userStatus === 'kleinunternehmer') return 0.25
  return 0.3
}

function industryLabel(industry?: string) {
  const labels: Record<string, string> = {
    dienstleistung: 'Dienstleistung',
    handwerker: 'Handwerk',
    handel: 'Handel',
    gastronomie: 'Gastronomie',
    gesundheit: 'Gesundheit & Pflege',
    beauty: 'Beauty & Kosmetik',
    kreativ: 'Kreativbranche',
    beratung: 'Beratung & Coaching',
    ecommerce: 'Onlinehandel',
    vermietung: 'Vermietung',
    verein: 'Verein / Organisation',
    sonstiges: 'deine Branche',
  }

  return labels[industry || 'sonstiges'] || 'deine Branche'
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
  const costRatio = incomeTotal > 0 ? expenseTotal / incomeTotal : 0

  const taxRate = taxRateForStatus(userStatus)
  const taxReserve = profit > 0 ? profit * taxRate : 0
  const availableAfterReserve = profit - taxReserve

  if (incomeTotal === 0 && expenseTotal === 0) {
    return [
      {
        id: 'start-empty',
        title: '🌱 Mila ist bereit',
        message:
          'Erfasse deine erste Einnahme oder Ausgabe. Danach erkennt Mila Muster, Rücklagen und nächste sinnvolle Schritte.',
        type: 'goal',
      },
    ]
  }

  const openIncomes = incomes.filter((income) => {
    const status = String(income.status || '').toLowerCase()
    return status === 'offen' || status === 'pending' || !status
  })

  const overdueIncomes = incomes.filter((income) => {
    const status = String(income.status || '').toLowerCase()
    return status === 'ueberfaellig' || status === 'überfällig' || status === 'overdue'
  })

  if (overdueIncomes.length > 0) {
    const total = overdueIncomes.reduce((sum, i) => sum + number(i.amount), 0)

    insights.push({
      id: 'overdue-income',
      title: '🚨 Überfällige Kundenzahlungen',
      message: `Du wartest auf ${overdueIncomes.length} überfällige Zahlungseingänge über ${money(
        total
      )}. Das ist heute deine wichtigste Baustelle.`,
      type: 'warning',
    })
  }

  if (openIncomes.length > 0) {
    const openTotal = openIncomes.reduce((sum, i) => sum + number(i.amount), 0)

    insights.push({
      id: 'open-income',
      title: '📥 Erwartete Zahlungseingänge',
      message: `Du wartest aktuell auf ${openIncomes.length} Zahlungseingang${
        openIncomes.length === 1 ? '' : 'e'
      } über ${money(openTotal)}. Prüfe, was davon schon bezahlt wurde.`,
      type: 'invoice',
    })
  }

  if (profit < 0) {
    insights.push({
      id: 'liquidity-warning',
      title: '⚠️ Liquidität prüfen',
      message: `Deine Ausgaben liegen aktuell ${money(
        Math.abs(profit)
      )} über deinen Einnahmen. Prüfe zuerst Fixkosten, offene Kundenzahlungen und doppelte Buchungen.`,
      type: 'warning',
    })
  }

  if (profit > 0) {
    insights.push({
      id: 'tax-reserve',
      title: '💰 Rücklage einplanen',
      message: `Plane ungefähr ${money(
        taxReserve
      )} als Orientierung ein. Danach bleiben rechnerisch etwa ${money(
        availableAfterReserve
      )} frei verfügbar.`,
      type: 'tax',
    })
  }

  if (incomeTotal > 0 && costRatio >= 0.8) {
    insights.push({
      id: 'high-cost-ratio',
      title: '📉 Kostenquote hoch',
      message: `Du nutzt rund ${Math.round(
        costRatio * 100
      )}% deiner Einnahmen für Ausgaben. Mila würde zuerst Abos, Fixkosten und größere Posten prüfen.`,
      type: 'budget',
    })
  }

  if (incomeTotal > 0 && costRatio <= 0.35 && profit > 0) {
    insights.push({
      id: 'healthy-margin',
      title: '🟢 Solider Spielraum',
      message:
        'Deine Kostenquote wirkt gesund. Nutze den Spielraum für Rücklagen, offene Verpflichtungen oder gezielte Investitionen.',
      type: 'budget',
    })
  }

  const vendors: Record<string, { label: string; count: number; total: number }> = {}

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
      const yearlyEstimate = monthlyEstimate * 12

      insights.push({
        id: `sub-${key}`,
        title: '🔁 Wiederkehrende Ausgabe',
        message: `${data.label} wurde ${data.count}x erkannt. Wenn das monatlich läuft, sind das ca. ${money(
          yearlyEstimate
        )} im Jahr.`,
        type: 'subscription',
      })
    }
  })

  const softwareExpenses = expenses.filter(
    (expense) => getEntryCategory(expense) === 'software'
  )

  if (
    ['freiberufler', 'selbststaendig_gewerbe', 'selbstständig', 'selbststaendig', 'kleinunternehmer'].includes(
      userStatus
    ) &&
    softwareExpenses.length > 0
  ) {
    const total = softwareExpenses.reduce((sum, e) => sum + number(e.amount), 0)

    insights.push({
      id: 'software-tools',
      title: '💻 Software & Tools',
      message: `${softwareExpenses.length} Tool-Kosten erkannt (${money(
        total
      )}). Gerade KI-, Design- und Hosting-Tools solltest du regelmäßig auf Nutzen prüfen.`,
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
      } wirken privat (${money(total)}). Mila hält sie getrennt, damit deine Auswertung sauber bleibt.`,
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

  if (userStatus === 'freiberufler' && profit > 0) {
    insights.push({
      id: 'freelancer-profit',
      title: '📈 Freiberuflicher Überschuss',
      message: `Dein aktueller Überschuss liegt bei ${money(
        profit
      )}. Mila beobachtet daraus Rücklagen, Kostenquote und mögliche Engpässe.`,
      type: 'business',
    })
  }

  if (userStatus === 'kleinunternehmer') {
    const limit = 25000
    const remaining = limit - incomeTotal

    insights.push({
      id: 'ku-limit',
      title: '⚠️ Kleinunternehmergrenze',
      message:
        remaining > 0
          ? `Bis zur 25.000 €-Grenze bleiben dir aktuell noch ${money(
              remaining
            )} Umsatz-Spielraum.`
          : 'Du liegst über 25.000 € Umsatz. Prüfe, ob die Kleinunternehmerregelung noch passt.',
      type: 'warning',
    })
  }

  const industryMessages: Record<string, string> = {
  dienstleistung:
    'Achte besonders auf Kundenzahlungen, wiederkehrende Kosten, Arbeitszeit und deine Marge.',

  handwerker:
    'Material, Werkzeug, Fahrzeuge, Baustellenfahrten und größere Anschaffungen sind wichtige Kostenblöcke.',

  handel:
    'Wareneinkauf, Lagerbestand, Einkaufspreise und Zahlungsziele beeinflussen deine Liquidität.',

  gastronomie:
    'Wareneinsatz, Energie, Lieferanten, Personal und Schwankungen sollten regelmäßig geprüft werden.',

  gesundheit:
    'Achte auf Ausstattung, Fortbildungen, Abrechnung, Material und laufende Betriebskosten.',

  beauty:
    'Produkte, Verbrauchsmaterial, Geräte, Termine und Stammkunden beeinflussen deinen Gewinn.',

  kreativ:
    'Software, Technik, Ausstattung, Lizenzen und Projektpreise solltest du im Blick behalten.',

  beratung:
    'Achte auf offene Kundenzahlungen, Weiterbildung, Software und deine abrechenbare Zeit.',

  ecommerce:
    'Versand, Retouren, Werbung, Einkaufspreise und Gebühren beeinflussen deine Marge.',

  vermietung:
    'Behalte Reparaturen, laufende Kosten, Rücklagen und Einnahmen im Blick.',

  verein:
    'Beiträge, Förderungen, Ausgaben und Budgets sollten sauber getrennt werden.',

  sonstiges:
    'Mila sucht nach Mustern, Risiken, Sparmöglichkeiten und Chancen in deinen Zahlen.',
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