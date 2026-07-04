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

function getText(entry: any) {
  return `${entry.title || ''} ${entry.vendor || ''} ${entry.client || ''} ${
    entry.category || ''
  } ${entry.note || ''}`.toLowerCase()
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

  if (totalExpenses > totalIncomes) {
    alerts.push({
      id: 'liquidity',
      type: 'danger',
      title: '🚨 Liquiditätswarnung',
      message:
        'Deine Ausgaben liegen aktuell über deinen Einnahmen. Prüfe zuerst Fixkosten, Ausstehende Kundenzahlungenund unnötige Abbuchungen.',
    })
  }

  const openIncomes = incomes.filter((income) => {
    const status = String(income.status || '').toLowerCase()
    return status === 'offen' || status === 'pending' || status === 'unbezahlt' || !status
  })

  if (openIncomes.length > 0) {
    const openTotal = openIncomes.reduce((sum, income) => sum + number(income.amount), 0)

    alerts.push({
      id: 'open-incomes',
      type: openTotal > 1000 || openIncomes.length >= 3 ? 'warning' : 'info',
      title: '📄 Ausstehende Kundenzahlungen',
      message: `${openIncomes.length} offene Einnahme${
        openIncomes.length === 1 ? '' : 'n'
      } über ${money(openTotal)}. Prüfe, was bezahlt, offen oder überfällig ist.`,
    })
  }

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
      title: '🚨 Überfällige Zahlungseingänge',
      message: `${overdueIncomes.length} Einnahme${
        overdueIncomes.length === 1 ? ' ist' : 'n sind'
      } überfällig (${money(overdueTotal)}). Das ist heute wichtiger als neue Ausgaben zu sortieren.`,
    })
  }

  if (balance > 0) {
    const taxReserve = balance * 0.3

    alerts.push({
      id: 'tax',
      type: 'info',
      title: '💰 Rücklage einplanen',
      message: `Empfohlene Orientierung: ${money(
        taxReserve
      )}. Mila markiert das nur als Planungshilfe, nicht als Steuerberatung.`,
    })
  }

  const missingReceipts = expenses.filter((expense) => expense.hasReceipt === false)

  if (missingReceipts.length > 0) {
    alerts.push({
      id: 'missing-receipts',
      type: 'warning',
      title: '📸 Belege fehlen',
      message: `${missingReceipts.length} Ausgabe${
        missingReceipts.length === 1 ? '' : 'n'
      } haben aktuell keinen Beleg. Das sollte Mila später sauber nachfordern.`,
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

  Object.entries(vendorMap).forEach(([vendor, data]) => {
    if (data.count >= 3) {
      alerts.push({
        id: `recurring-${vendor.toLowerCase().replace(/\s+/g, '-')}`,
        type: 'info',
        title: '💡 Wiederkehrende Ausgabe',
        message: `${vendor} wurde ${data.count}x gebucht (${money(
          data.total
        )} gesamt). Mila sollte prüfen, ob das ein Abo, Fixkostenblock oder Muster ist.`,
      })
    }
  })

  const vehicleExpenses = expenses.filter(
    (expense) => getEntryCategory(expense) === 'fahrzeug'
  )

  if (vehicleExpenses.length >= 2) {
    alerts.push({
      id: 'vehicle-pattern',
      type: 'info',
      title: '⛽ Fahrtkosten erkannt',
      message:
        'Mila sieht mehrere Fahrzeug-/Fahrtkosten. Prüfe später, ob Fahrten oder Kilometer dokumentiert werden müssen.',
    })
  }

  const privateExpenses = expenses.filter(
    (expense) => getEntryCategory(expense) === 'privat'
  )

  if (privateExpenses.length > 0) {
    alerts.push({
      id: 'private-expenses',
      type: 'info',
      title: '🔒 Private Ausgaben erkannt',
      message: `${privateExpenses.length} Ausgabe${
        privateExpenses.length === 1 ? '' : 'n'
      } wirken privat. Mila sollte sie getrennt halten, damit die Auswertung sauber bleibt.`,
    })
  }

  return alerts.slice(0, 10)
}