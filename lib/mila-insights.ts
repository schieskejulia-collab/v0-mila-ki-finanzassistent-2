import { getEntryCategory } from './mila-classifier'
import {
  getObligationInsights,
  type ObligationInsight,
} from './mila-obligation-insights'

import type { Obligation } from './mila-obligations'
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

    digital: 'Digital / KI / Automatisierung',

    kreativ: 'Kreativ / Medien',

    beratung: 'Beratung',

    handwerk: 'Handwerk',

    gesundheit: 'Gesundheit & Pflege',

    gastro: 'Gastronomie',

    handel: 'Handel / E-Commerce',

    dienstleistung: 'Dienstleistung',

    bildung: 'Bildung / Coaching',

    sonstiges: 'deine Branche',

  }

  return labels[industry || 'sonstiges'] || 'deine Branche'

}

function incomeStatus(value: any) {

  return String(value || '').toLowerCase().trim()

}

export function getMilaInsights(
  incomes: any[],
  expenses: any[],
  userStatus: string,
  industry?: string,
  obligations: Obligation[] = []
): MilaInsight[] {

  const urgent: MilaInsight[] = []

  const important: MilaInsight[] = []

  const helpful: MilaInsight[] = []

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

          'Erfasse deine erste Buchung. Danach erkennt Mila Muster, Rücklagen und sinnvolle nächste Schritte.',

        type: 'goal',

      },

    ]

  }

  const openIncomes = incomes.filter((income) => {

    const status = incomeStatus(income.status)

    return status === 'offen' || status === 'pending' || !status

  })

  const overdueIncomes = incomes.filter((income) => {

    const status = incomeStatus(income.status)

    return status === 'ueberfaellig' || status === 'überfällig' || status === 'overdue'

  })

  if (profit < 0) {

    urgent.push({

      id: 'liquidity-warning',

      title: '🔴 Liquidität zuerst prüfen',

      message: `Deine Ausgaben liegen aktuell ${money(

        Math.abs(profit)

      )} über deinen Einnahmen. Mila würde zuerst erwartete Zahlungseingänge, Fixkosten und doppelte Buchungen sortieren.`,

      type: 'warning',

    })

  }

  if (overdueIncomes.length > 0) {

    const total = overdueIncomes.reduce((sum, i) => sum + number(i.amount), 0)

    urgent.push({

      id: 'overdue-income',

      title: '🟡 Überfällige Zahlungseingänge',

      message: `Du wartest auf ${overdueIncomes.length} überfällige Zahlungseingang${

        overdueIncomes.length === 1 ? '' : 'e'

      } über ${money(total)}. Das ist wichtiger als neue Ausgaben zu optimieren.`,

      type: 'invoice',

    })

  }

  if (openIncomes.length > 0) {

    const openTotal = openIncomes.reduce((sum, i) => sum + number(i.amount), 0)

    important.push({

      id: 'open-income',

      title: '📥 Erwartete Zahlungseingänge',

      message: `Du wartest aktuell auf ${openIncomes.length} Zahlungseingang${

        openIncomes.length === 1 ? '' : 'e'

      } über ${money(openTotal)}. Mila würde heute nur prüfen, welche davon schon erledigt sind.`,

      type: 'invoice',

    })

  }

  if (profit > 0) {
  helpful.push({
    id: 'tax-reserve-paused',
    title: '💰 Rücklage später fein berechnen',
    message:
      'Mila sammelt deine Einnahmen, Ausgaben und dein Profil. Die genaue Rücklagen-Logik wird erst berechnet, wenn dein Steuerprofil vollständig genug ist.',
    type: 'tax',
  })
}

  if (incomeTotal > 0 && costRatio >= 0.8) {

    important.push({

      id: 'high-cost-ratio',

      title: '🟡 Kostenquote beobachten',

      message: `Du nutzt rund ${Math.round(

        costRatio * 100

      )}% deiner Einnahmen für Ausgaben. Mila würde Fixkosten und größere Posten gesammelt prüfen, nicht jede einzelne Buchung dramatisieren.`,

      type: 'budget',

    })

  }

  if (incomeTotal > 0 && costRatio <= 0.35 && profit > 0) {

    helpful.push({

      id: 'healthy-margin',

      title: '🟢 Solider Spielraum',

      message:

        'Deine Kostenquote wirkt gesund. Das ist ein guter Moment, um Rücklagen, Ziele oder geplante Investitionen ruhig zu sortieren.',

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

  const recurring = Object.entries(vendors).filter(([, data]) => data.count >= 3)

  if (recurring.length >= 2) {

    const totalRecurring = recurring.reduce((sum, [, data]) => sum + data.total, 0)

    helpful.push({

      id: 'recurring-summary',

      title: '🔁 Wiederkehrende Kosten erkannt',

      message: `Mila erkennt ${recurring.length} wiederkehrende Kostenblöcke über zusammen ${money(

        totalRecurring

      )}. Kein Alarm — diese Kosten sollten eher gesammelt im Monatscheck geprüft werden.`,

      type: 'subscription',

    })

  }

  const softwareExpenses = expenses.filter(

    (expense) => getEntryCategory(expense) === 'software'

  )

  if (softwareExpenses.length >= 3) {

    const total = softwareExpenses.reduce((sum, e) => sum + number(e.amount), 0)

    helpful.push({

      id: 'software-tools',

      title: '💻 Tool-Kosten im Blick',

      message: `${softwareExpenses.length} Software-/Tool-Kosten erkannt (${money(

        total

      )}). Mila bewertet sie nicht automatisch negativ, sondern prüft später Nutzen, Häufigkeit und Liquidität zusammen.`,

      type: 'business',

    })

  }

  const privateExpenses = expenses.filter(

    (expense) => getEntryCategory(expense) === 'privat'

  )

  if (privateExpenses.length >= 3) {

    const total = privateExpenses.reduce((sum, e) => sum + number(e.amount), 0)

    helpful.push({

      id: 'private-expenses',

      title: '🔒 Private Ausgaben getrennt halten',

      message: `${privateExpenses.length} Ausgaben wirken privat (${money(

        total

      )}). Mila hält sie getrennt, damit geschäftliche Auswertungen sauber bleiben.`,

      type: 'budget',

    })

  }

  if (userStatus === 'kleinunternehmer') {

    const limit = 25000

    const remaining = limit - incomeTotal

    important.push({

      id: 'ku-limit',

      title: '⚠️ Kleinunternehmergrenze beobachten',

      message:

        remaining > 0

          ? `Bis zur 25.000 €-Grenze bleiben dir aktuell noch ${money(

              remaining

            )} Umsatz-Spielraum.`

          : 'Du liegst über 25.000 € Umsatz. Mila würde prüfen lassen, ob die Kleinunternehmerregelung noch passt.',

      type: 'warning',

    })

  }

  const industryMessages: Record<string, string> = {

    digital:

      'Bei digitalen Leistungen achtet Mila besonders auf Software, Tools, wiederkehrende Kosten, Projektmargen und Zahlungseingänge.',

    kreativ:

      'In der Kreativbranche sind Technik, Software, Lizenzen, Projektpreise und offene Kundenzahlungen besonders wichtig.',

    beratung:

      'In Beratung und Coaching zählen abrechenbare Zeit, Weiterbildung, Software, Reisekosten und Zahlungseingänge.',

    handwerk:

      'Im Handwerk achtet Mila besonders auf Material, Werkzeug, Fahrzeugkosten, Baustellenfahrten und größere Anschaffungen.',

    gesundheit:

      'Im Bereich Gesundheit & Pflege sind Ausstattung, Fortbildungen, Material, Abrechnung und laufende Kosten wichtige Punkte.',

    gastro:

      'In der Gastronomie wirken Wareneinsatz, Energie, Lieferanten, Personal und Schwankungen stark auf die Liquidität.',

    handel:

      'Im Handel achtet Mila auf Wareneinkauf, Lagerbestand, Versand, Retouren, Gebühren und Zahlungsziele.',

    dienstleistung:

      'Bei Dienstleistungen sind Kundenzahlungen, wiederkehrende Kosten, Arbeitszeit und Marge besonders wichtig.',

    bildung:

      'Bei Bildung und Coaching achtet Mila auf Kurse, Tools, Räume, Marketing, Materialien und Zahlungseingänge.',

    sonstiges:

      'Mila sucht nach Mustern, Risiken, Sparmöglichkeiten und Chancen in deinen Zahlen.',

  }

  helpful.push({

    id: `industry-${industry || 'sonstiges'}`,

    title: `🎯 Fokus ${industryLabel(industry)}`,

    message:

      industryMessages[industry || 'sonstiges'] || industryMessages.sonstiges,

    type: 'business',

  })
const obligationInsights = getObligationInsights(
  obligations,
  availableAfterReserve
)

obligationInsights.forEach((item) => {
  if (item.level === 'important') {
    urgent.push({
      id: item.id,
      title: item.title,
      message: item.message,
      type: 'warning',
    })
    return
  }

  if (item.level === 'reminder') {
    important.push({
      id: item.id,
      title: item.title,
      message: item.message,
      type: 'budget',
    })
    return
  }

  helpful.push({
    id: item.id,
    title: item.title,
    message: item.message,
    type: 'budget',
  })
})
  return [...urgent, ...important, ...helpful].slice(0, 6)
}
