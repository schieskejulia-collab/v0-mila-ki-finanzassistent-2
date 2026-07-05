import { getEntryCategory } from './mila-classifier'

export type MilaAlert = {
  id: string
  type: 'danger' | 'warning' | 'info'
  title: string
  message: string
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

export function getMilaAlerts(
  incomes: any[],
  expenses: any[],
  summary: any
): MilaAlert[] {
  const alerts: MilaAlert[] = []

  const totalIncomes = number(summary?.totalIncomes)
  const totalExpenses = number(summary?.totalExpenses)
  const balance = number(summary?.balance ?? totalIncomes - totalExpenses)

  const paidIncomes = incomes.filter((income) => {
    const status = String(income.status || '').toLowerCase()
    return status === 'bezahlt' || status === 'paid'
  })

  const openIncomes = incomes.filter((income) => {
    const status = String(income.status || '').toLowerCase()
    return status === 'offen' || status === 'pending' || status === 'unbezahlt'
  })

  const overdueIncomes = incomes.filter((income) => {
    const status = String(income.status || '').toLowerCase()
    return status === 'ueberfaellig' || status === 'überfällig' || status === 'overdue'
  })

  if (overdueIncomes.length > 0) {
    const overdueTotal = overdueIncomes.reduce(
      (sum, income) => sum + number(income.amount),
      0
    )

    alerts.push({
      id: 'overdue-incomes',
      type: 'danger',
      title: '🔴 Zahlung zuerst prüfen',
      message: `${overdueIncomes.length} Zahlung${
        overdueIncomes.length === 1 ? ' ist' : 'en sind'
      } überfällig (${money(overdueTotal)}). Mila würde heute zuerst diese Eingänge klären.`,
    })
  }

  if (openIncomes.length > 0) {
    const openTotal = openIncomes.reduce(
      (sum, income) => sum + number(income.amount),
      0
    )

    alerts.push({
      id: 'open-incomes',
      type: openTotal > 1000 || openIncomes.length >= 3 ? 'warning' : 'info',
      title: '🟡 Offene Einnahmen im Blick',
      message: `${openIncomes.length} offene Zahlung${
        openIncomes.length === 1 ? '' : 'en'
      } über ${money(openTotal)}. Kein Alarm — aber gut, wenn du den Status aktuell hältst.`,
    })
  }

  if (balance < 0) {
    alerts.push({
      id: 'liquidity',
      type: 'warning',
      title: '🟠 Liquidität sortieren',
      message: `Dein aktueller Stand liegt bei ${money(balance)}. Mila würde heute Fixkosten, offene Einnahmen und notwendige Ausgaben zuerst sortieren.`,
    })
  }

  if (balance > 0 && totalIncomes > 0) {
    alerts.push({
      id: 'cashflow-stable',
      type: 'info',
      title: '🟢 Spielraum vorhanden',
      message: `Du hast aktuell ${money(balance)} Überschuss. Mila betrachtet das nicht automatisch als frei verfügbar, sondern behält Rücklagen und nächste Zahlungen mit im Blick.`,
    })
  }

  const missingReceipts = expenses.filter((expense) => expense.hasReceipt === false)

  if (missingReceipts.length > 0) {
    alerts.push({
      id: 'missing-receipts',
      type: 'warning',
      title: '📸 Belege nachreichen',
      message: `${missingReceipts.length} Ausgabe${
        missingReceipts.length === 1 ? '' : 'n'
      } haben noch keinen Beleg. Mila kann sie später gesammelt statt einzeln stressig erinnern.`,
    })
  }

  const vendorMap: Record<string, { count: number; total: number }> = {}

  expenses.forEach((expense) => {
    const vendor = String(
      expense.vendor || expense.client || expense.title || expense.category || ''
    ).trim()

    if (!vendor) return

    if (!vendorMap[vendor]) vendorMap[vendor] = { count: 0, total: 0 }

    vendorMap[vendor].count += 1
    vendorMap[vendor].total += number(expense.amount)
  })

  const recurring = Object.entries(vendorMap).filter(([, data]) => data.count >= 3)

  if (recurring.length > 0) {
    const totalRecurring = recurring.reduce((sum, [, data]) => sum + data.total, 0)

    alerts.push({
      id: 'recurring-summary',
      type: 'info',
      title: '🔁 Muster erkannt',
      message: `Mila erkennt ${recurring.length} wiederkehrende Kostenblock${
        recurring.length === 1 ? '' : 'e'
      } über zusammen ${money(totalRecurring)}. Das ist gut für spätere Monatschecks.`,
    })
  }

  const vehicleExpenses = expenses.filter(
    (expense) => getEntryCategory(expense) === 'fahrzeug'
  )

  if (vehicleExpenses.length >= 2) {
    alerts.push({
      id: 'vehicle-pattern',
      type: 'info',
      title: '🚗 Fahrtkosten erkannt',
      message:
        'Mila sieht mehrere Fahrt-/Fahrzeugkosten. Später kann sie helfen, berufliche Fahrten sauberer zu dokumentieren.',
    })
  }

  const privateExpenses = expenses.filter(
    (expense) => getEntryCategory(expense) === 'privat'
  )

  if (privateExpenses.length > 0) {
    alerts.push({
      id: 'private-expenses',
      type: 'info',
      title: '🔒 Privat getrennt halten',
      message: `${privateExpenses.length} Ausgabe${
        privateExpenses.length === 1 ? '' : 'n'
      } wirken privat. Mila hält sie getrennt, damit deine Auswertung sauber bleibt.`,
    })
  }

  if (
    alerts.length === 0 &&
    incomes.length + expenses.length < 3
  ) {
    alerts.push({
      id: 'learning',
      type: 'info',
      title: '🌱 Mila lernt dein Muster',
      message:
        'Noch sind wenige Daten vorhanden. Nach weiteren Buchungen erkennt Mila bessere Muster, Risiken und Chancen.',
    })
  }

  if (
    alerts.length === 0 &&
    balance >= 0
  ) {
    alerts.push({
      id: 'calm',
      type: 'info',
      title: '🟢 Ruhige Lage',
      message:
        'Mila sieht aktuell nichts Dringendes. Behalte Rücklagen, Fristen und neue Buchungen einfach weiter im Blick.',
    })
  }

  return alerts.slice(0, 6)
}