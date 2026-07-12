import type { Expense, Income } from './store'
import type { Obligation } from './mila-obligations'
import { detectVendor } from './mila-vendor-detection'
import type { MilaVendorType } from './mila-vendors'

export type MilaPattern = {
  id: string
  title: string
  description: string
  severity: 'good' | 'info' | 'warning'
  confidence: number
}

type VendorGroup = {
  name: string
  type: MilaVendorType
  count: number
  total: number
  confidence: number
}

function money(value: number) {
  return Number(value || 0).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function safeId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getExpenseText(expense: Expense) {
  return [
    expense.vendor,
    expense.title,
    expense.category,
    (expense as any).note,
  ]
    .filter(Boolean)
    .join(' ')
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

  /* ---------------------------------------------------------
     Liquidität
  --------------------------------------------------------- */

  if (balance > 1000) {
    patterns.push({
      id: 'strong-liquidity',
      title: '🟢 Gute Liquidität',
      description: `Aktuell bleibt ein Überschuss von ${money(
        balance
      )}. Das gibt dir finanziellen Spielraum.`,
      severity: 'good',
      confidence: 100,
    })
  } else if (balance < 0) {
    patterns.push({
      id: 'negative-liquidity',
      title: '🔴 Ausgaben übersteigen Einnahmen',
      description:
        'Momentan liegen deine Ausgaben über deinen Einnahmen. Mila würde zuerst die größten Kosten und offenen Verpflichtungen ansehen.',
      severity: 'warning',
      confidence: 100,
    })
  }

  /* ---------------------------------------------------------
     Anbieter erkennen und gruppieren
  --------------------------------------------------------- */

  const vendorGroups = new Map<string, VendorGroup>()

  for (const expense of expenses) {
    const text = getExpenseText(expense)

    if (!text.trim()) continue

    const result = detectVendor(text)

    if (!result.vendor) continue

    const key = `${result.vendor.type}:${result.vendor.name}`

    const current = vendorGroups.get(key) || {
      name: result.vendor.name,
      type: result.vendor.type,
      count: 0,
      total: 0,
      confidence: 0,
    }

    current.count += 1
    current.total += Number(expense.amount || 0)
    current.confidence = Math.max(
      current.confidence,
      result.confidence
    )

    vendorGroups.set(key, current)
  }

  /* ---------------------------------------------------------
     Wiederkehrende bekannte Anbieter
  --------------------------------------------------------- */

  for (const group of vendorGroups.values()) {
    if (group.count < 2) continue

    patterns.push({
      id: `vendor-${safeId(group.name)}`,
      title: `🔁 ${group.name} taucht regelmäßig auf`,
      description: `${group.name} wurde ${group.count} Mal mit insgesamt ${money(
        group.total
      )} erkannt. Mila behält im Blick, ob daraus ein regelmäßiger Vertrag oder ein Abo entsteht.`,
      severity: 'info',
      confidence: Math.round(group.confidence * 100),
    })
  }

  /* ---------------------------------------------------------
     Software und digitale Tools
  --------------------------------------------------------- */

  const softwareGroups = Array.from(
    vendorGroups.values()
  ).filter((group) => group.type === 'software')

  if (softwareGroups.length > 0) {
    const count = softwareGroups.reduce(
      (sum, group) => sum + group.count,
      0
    )

    const total = softwareGroups.reduce(
      (sum, group) => sum + group.total,
      0
    )

    patterns.push({
      id: 'known-software-costs',
      title: '💻 Digitale Tools im Blick',
      description: `Mila hat ${count} Ausgabe${
        count === 1 ? '' : 'n'
      } bei bekannten Software- oder Digitalanbietern über insgesamt ${money(
        total
      )} erkannt.`,
      severity: 'info',
      confidence: 95,
    })
  }

  /* ---------------------------------------------------------
     Versicherungen und Krankenkassen
  --------------------------------------------------------- */

  const insuranceGroups = Array.from(
    vendorGroups.values()
  ).filter((group) => group.type === 'versicherung')

  if (insuranceGroups.length > 0) {
    const total = insuranceGroups.reduce(
      (sum, group) => sum + group.total,
      0
    )

    const names = insuranceGroups
      .map((group) => group.name)
      .slice(0, 3)
      .join(', ')

    patterns.push({
      id: 'insurance-providers',
      title: '🏥 Versicherungen erkannt',
      description: `Mila hat Zahlungen an ${names} über insgesamt ${money(
        total
      )} erkannt. Mit weiteren Buchungen kann sie prüfen, ob diese monatlich, quartalsweise oder jährlich auftreten.`,
      severity: 'info',
      confidence: 95,
    })
  }

  /* ---------------------------------------------------------
     Behörden
  --------------------------------------------------------- */

  const authorityGroups = Array.from(
    vendorGroups.values()
  ).filter((group) => group.type === 'behoerde')

  if (authorityGroups.length > 0) {
    const names = authorityGroups
      .map((group) => group.name)
      .slice(0, 3)
      .join(', ')

    patterns.push({
      id: 'authority-payments',
      title: '🏛️ Behördliche Zahlung erkannt',
      description: `Mila hat eine Buchung mit Bezug zu ${names} erkannt. Solche Vorgänge behält sie besonders wegen möglicher Fristen im Blick.`,
      severity: 'info',
      confidence: 90,
    })
  }

  /* ---------------------------------------------------------
     Onlinekäufe
  --------------------------------------------------------- */

  const shoppingGroups = Array.from(
    vendorGroups.values()
  ).filter((group) => group.type === 'onlinehandel')

  const shoppingCount = shoppingGroups.reduce(
    (sum, group) => sum + group.count,
    0
  )

  if (shoppingCount >= 3) {
    const total = shoppingGroups.reduce(
      (sum, group) => sum + group.total,
      0
    )

    patterns.push({
      id: 'online-shopping-pattern',
      title: '🛒 Mehrere Onlinekäufe erkannt',
      description: `Mila hat ${shoppingCount} Onlinekäufe über insgesamt ${money(
        total
      )} erkannt. Das ist zunächst nur ein Muster – keine Bewertung.`,
      severity: 'info',
      confidence: 90,
    })
  }

  /* ---------------------------------------------------------
     Telefon und Energie
  --------------------------------------------------------- */

  const contractGroups = Array.from(
    vendorGroups.values()
  ).filter(
    (group) =>
      group.type === 'telefon' ||
      group.type === 'energie'
  )

  if (contractGroups.some((group) => group.count >= 2)) {
    const names = contractGroups
      .filter((group) => group.count >= 2)
      .map((group) => group.name)
      .join(', ')

    patterns.push({
      id: 'regular-household-contracts',
      title: '🏠 Laufende Verträge erkannt',
      description: `${names} taucht wiederholt auf. Mila prüft mit der Zeit, in welchem Rhythmus diese Zahlungen anfallen.`,
      severity: 'info',
      confidence: 90,
    })
  }

  /* ---------------------------------------------------------
     Alte Kategorie-Erkennung als Fallback
  --------------------------------------------------------- */

  const softwareExpenses = expenses.filter(
    (item) =>
      String(item.category || '').toLowerCase() ===
        'software' ||
      String(item.category || '').toLowerCase() === 'ki' ||
      String(item.category || '').toLowerCase() === 'tools'
  )

  if (
    softwareGroups.length === 0 &&
    softwareExpenses.length >= 3
  ) {
    const total = softwareExpenses.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    )

    patterns.push({
      id: 'software-costs-fallback',
      title: '💻 Software- und KI-Kosten',
      description: `${softwareExpenses.length} Software- oder KI-Ausgaben über insgesamt ${money(
        total
      )} wurden anhand ihrer Kategorie erkannt.`,
      severity: 'info',
      confidence: 85,
    })
  }

  /* ---------------------------------------------------------
     Offene Verpflichtungen
  --------------------------------------------------------- */

  const openObligations = obligations.filter(
    (item) =>
      item.status !== 'bezahlt' &&
      item.status !== 'erledigt'
  )

  if (openObligations.length >= 5) {
    patterns.push({
      id: 'many-obligations',
      title: '📅 Viele offene Verpflichtungen',
      description: `${openObligations.length} Verpflichtungen sind aktuell noch offen. Mila würde sie nach Frist und Wichtigkeit sortieren.`,
      severity: 'warning',
      confidence: 100,
    })
  }

  /* ---------------------------------------------------------
     Einnahmen
  --------------------------------------------------------- */

  if (incomes.length >= 5) {
    patterns.push({
      id: 'stable-income',
      title: '💶 Mehrere Einnahmen erkannt',
      description:
        'Mila erkennt mehrere Einnahmen. Mit mehr Daten kann sie prüfen, ob daraus ein regelmäßiger Geldfluss entsteht.',
      severity: 'good',
      confidence: 80,
    })
  }

  /* ---------------------------------------------------------
     Positive Entwicklung
  --------------------------------------------------------- */

  if (
    totalIncome > 0 &&
    totalExpenses < totalIncome * 0.7
  ) {
    patterns.push({
      id: 'healthy-spending',
      title: '🌱 Finanzieller Spielraum',
      description:
        'Deine erfassten Ausgaben liegen deutlich unter deinen Einnahmen. Das schafft Raum für Rücklagen und kommende Verpflichtungen.',
      severity: 'good',
      confidence: 85,
    })
  }

  /* ---------------------------------------------------------
     Doppelte Muster entfernen und sortieren
  --------------------------------------------------------- */

  const uniquePatterns = Array.from(
    new Map(
      patterns.map((pattern) => [pattern.id, pattern])
    ).values()
  )

  const order = {
    warning: 0,
    info: 1,
    good: 2,
  }

  return uniquePatterns
    .sort((a, b) => {
      const severityDifference =
        order[a.severity] - order[b.severity]

      if (severityDifference !== 0) {
        return severityDifference
      }

      return b.confidence - a.confidence
    })
    .slice(0, 8)
}