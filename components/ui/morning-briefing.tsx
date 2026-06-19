'use client'

import { useFinance } from '../../lib/store'

function formatEuro(value: number) {
  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function getStatusLabel(status?: string) {
  if (!status) return 'freelancer'

  const value = status.toLowerCase()

  if (value.includes('angestellt')) return 'angestellt'
  if (value.includes('klein')) return 'kleinunternehmer'
  if (value.includes('selbst')) return 'selbstständig'
  if (value.includes('freelancer')) return 'freelancer'

  return value
}

function getIndustryLabel(industry?: string) {
  if (!industry) return ''

  return industry.toLowerCase()
}

function findRecurringExpenses(expenses: any[]) {
  const groups: Record<string, { count: number; total: number; name: string }> = {}

  expenses.forEach((expense) => {
    const name = String(expense.vendor || expense.title || '').trim()

    if (!name) return

    const key = name.toLowerCase()
    const amount = Number(expense.amount || 0)

    if (!groups[key]) {
      groups[key] = {
        count: 0,
        total: 0,
        name,
      }
    }

    groups[key].count += 1
    groups[key].total += amount
  })

  return Object.values(groups).filter((item) => item.count >= 3)
}

function getSoftwareExpenses(expenses: any[]) {
  const softwareWords = [
    'adobe',
    'canva',
    'figma',
    'chatgpt',
    'openai',
    'claude',
    'notion',
    'hetzner',
    'ionos',
    'domain',
    'hosting',
    'vercel',
    'github',
    'software',
    'tool',
  ]

  return expenses.filter((expense) => {
    const text = `${expense.title || ''} ${expense.vendor || ''} ${expense.category || ''}`.toLowerCase()

    return softwareWords.some((word) => text.includes(word))
  })
}

function getMorningTip({
  summary,
  expenses,
  incomes,
  userStatus,
  industry,
}: {
  summary: any
  expenses: any[]
  incomes: any[]
  userStatus?: string
  industry?: string
}) {
  const status = getStatusLabel(userStatus)
  const branch = getIndustryLabel(industry)
  const recurring = findRecurringExpenses(expenses)
  const softwareExpenses = getSoftwareExpenses(expenses)

  if (summary.balance < 0) {
    return 'Deine Ausgaben liegen aktuell über deinen Einnahmen. Prüfe zuerst Fixkosten, Abos und unnötige Ausgaben.'
  }

  if (status === 'angestellt') {
    return 'Prüfe Arbeitsmittel, Homeoffice, Fahrtkosten und Weiterbildungen. Diese können je nach Situation steuerlich relevant sein.'
  }

  if (recurring.length > 0) {
    return `Du hast ${recurring.length} wiederkehrende Kosten erkannt. Prüfe, ob alle Abos und Fixkosten noch wirklich nötig sind.`
  }

  if (summary.balance > 1000) {
    return `Dein Monat läuft stark. Plane ca. ${formatEuro(summary.balance * 0.3)} als mögliche Steuer-Rücklage ein.`
  }

  if (branch.includes('web')) {
    return 'Als Webdesigner solltest du besonders Software, Hosting, Domains, KI-Tools und Projektmargen im Blick behalten.'
  }

  if (branch.includes('reinigung')) {
    return 'Bei Reinigungsfirmen sind Material, Fahrtkosten, Arbeitskleidung und wiederkehrende Aufträge besonders wichtig.'
  }

  if (branch.includes('handwerk')) {
    return 'Im Handwerk solltest du Material, Werkzeug, Fahrtkosten und projektbezogene Ausgaben sauber trennen.'
  }

  if (softwareExpenses.length >= 3) {
    return `Du hast ${softwareExpenses.length} Software- oder Toolkosten erkannt. Prüfe, ob alle Tools aktiv genutzt werden.`
  }

  if (expenses.length > incomes.length) {
    return 'Prüfe offene Rechnungen, wiederkehrende Kosten und doppelte Ausgaben.'
  }

  return 'Deine Finanzen wirken aktuell stabil. Behalte Rücklagen, Fixkosten und neue Ausgaben weiter im Blick.'
}

function getFinanceScore(summary: any, expenses: any[]) {
  let score = 80

  if (summary.balance < 0) score -= 35
  if (expenses.length > 10) score -= 10
  if (summary.balance > 1000) score += 10

  if (score > 100) score = 100
  if (score < 0) score = 0

  return score
}

export function MorningBriefing() {
  const {
    summary,
    expenses,
    incomes,
    userName,
    userStatus,
    industry,
  } = useFinance()

  const recurringExpenses = findRecurringExpenses(expenses)
  const softwareExpenses = getSoftwareExpenses(expenses)
  const taxReserve = summary.balance > 0 ? summary.balance * 0.3 : 0
  const financeScore = getFinanceScore(summary, expenses)

  const tip = getMorningTip({
    summary,
    expenses,
    incomes,
    userStatus,
    industry,
  })

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
        Heute für dich
      </p>

      <h2 className="mt-3 text-2xl font-black text-slate-950">
        Guten Tag, {userName || 'Julia'} 🌸
      </h2>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] font-black uppercase text-slate-400">
            Überschuss
          </p>
          <p className="mt-1 text-sm font-black text-violet-700">
            {formatEuro(summary.balance)}
          </p>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase text-slate-400">
            Einnahmen
          </p>
          <p className="mt-1 text-sm font-black text-emerald-700">
            {formatEuro(summary.totalIncomes)}
          </p>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase text-slate-400">
            Ausgaben
          </p>
          <p className="mt-1 text-sm font-black text-rose-700">
            {formatEuro(summary.totalExpenses)}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-violet-50 p-4">
        <p className="text-xs font-black uppercase text-violet-700">
          Mila Tipp ✨
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-700">
          {tip}
        </p>
      </div>

      <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
        <p className="text-xs font-black uppercase text-emerald-700">
          Finanzgesundheit
        </p>
        <p className="mt-1 text-2xl font-black text-emerald-800">
          {financeScore}/100
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-700">
          {financeScore >= 80
            ? 'Alles wirkt aktuell stabil.'
            : financeScore >= 50
            ? 'Mila sieht Optimierungspotenzial.'
            : 'Achtung: Deine Finanzen brauchen Aufmerksamkeit.'}
        </p>
      </div>

      {taxReserve > 0 && (
        <div className="mt-5 rounded-2xl bg-yellow-50 p-4">
          <p className="text-xs font-black uppercase text-yellow-700">
            Steuer-Rücklage
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            Plane ungefähr {formatEuro(taxReserve)} als Orientierung ein. Das ist keine Steuerberatung.
          </p>
        </div>
      )}

      {recurringExpenses.length > 0 && (
        <div className="mt-5 rounded-2xl bg-blue-50 p-4">
          <p className="text-xs font-black uppercase text-blue-700">
            Wiederkehrende Kosten
          </p>

          {recurringExpenses.slice(0, 3).map((item) => (
            <p key={item.name} className="mt-2 text-sm font-semibold text-slate-700">
              {item.name} wurde {item.count}x gebucht ({formatEuro(item.total)} gesamt).
            </p>
          ))}
        </div>
      )}

      {softwareExpenses.length > 0 && (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase text-slate-600">
            Software & Tools
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            Mila hat {softwareExpenses.length} Software-/Tool-Kosten erkannt. Prüfe, ob alle Tools aktiv genutzt werden.
          </p>
        </div>
      )}
    </section>
  )
}