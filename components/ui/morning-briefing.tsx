'use client'

import { useFinance } from '../../lib/store'

function formatEuro(value: number) {
  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function getGreeting() {
  const hour = new Date().getHours()

  if (hour < 11) return 'Guten Morgen'
  if (hour < 17) return 'Guten Tag'
  return 'Guten Abend'
}

function getText(entry: any) {
  return `${entry.title || ''} ${entry.vendor || ''} ${entry.client || ''} ${
    entry.category || ''
  } ${entry.note || ''}`.toLowerCase()
}

function findRecurringExpenses(expenses: any[]) {
  const groups: Record<string, { count: number; total: number; name: string }> =
    {}

  expenses.forEach((expense) => {
    const name = String(expense.vendor || expense.title || '').trim()
    if (!name) return

    const key = name.toLowerCase()
    const amount = Number(expense.amount || 0)

    if (!groups[key]) groups[key] = { count: 0, total: 0, name }

    groups[key].count += 1
    groups[key].total += amount
  })

  return Object.values(groups).filter((item) => item.count >= 2)
}

function getSoftwareExpenses(expenses: any[]) {
  return expenses.filter((expense) =>
    /adobe|canva|figma|chatgpt|openai|claude|notion|hetzner|ionos|domain|hosting|vercel|github|software|tool|saas/.test(
      getText(expense)
    )
  )
}

function getFinanceScore(summary: any, expenses: any[], incomes: any[]) {
  const income = Number(summary.totalIncomes || 0)
  const expense = Number(summary.totalExpenses || 0)
  const balance = Number(summary.balance || 0)

  if (income === 0 && expense === 0) return 60

  let score = 75

  if (balance < 0) score -= 35
  if (income > 0 && expense / income > 0.8) score -= 15
  if (income > 0 && expense / income < 0.4) score += 10
  if (balance > 1000) score += 10
  if (expenses.length > incomes.length * 4 && incomes.length > 0) score -= 5

  return Math.max(0, Math.min(100, score))
}

function getMainTip({
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
  const balance = Number(summary.balance || 0)
  const recurring = findRecurringExpenses(expenses)
  const software = getSoftwareExpenses(expenses)
  const branch = String(industry || '').toLowerCase()

  if (summary.totalIncomes === 0 && summary.totalExpenses === 0) {
    return 'Starte mit deiner ersten Buchung. Danach kann Mila Rücklagen, Muster und Hinweise für dich ableiten.'
  }

  if (balance < 0) {
    return 'Deine Ausgaben liegen über deinen Einnahmen. Prüfe zuerst Fixkosten, Abos und offene Einnahmen.'
  }

  if (userStatus === 'angestellt') {
    return 'Prüfe Arbeitsmittel, Weiterbildung, Fahrtkosten und wiederkehrende Kosten. Mila hilft dir beim Sortieren.'
  }

  if (recurring.length > 0) {
    return `Mila hat ${recurring.length} wiederkehrende Ausgabe${
      recurring.length === 1 ? '' : 'n'
    } erkannt. Prüfe, ob diese Kosten noch sinnvoll sind.`
  }

  if (balance > 1000) {
    return `Dein Monat läuft stark. Plane ungefähr ${formatEuro(
      balance * 0.3
    )} als vorsichtige Rücklage ein.`
  }

  if (branch.includes('web')) {
    return 'Für Webdesign sind Software, Hosting, Domains und KI-Tools wichtige Kostenblöcke. Mila behält sie im Blick.'
  }

  if (branch.includes('handwerk')) {
    return 'Im Handwerk sind Material, Werkzeug und Fahrtkosten besonders wichtig. Trenne diese Kosten möglichst sauber.'
  }

  if (software.length >= 3) {
    return `Du hast ${software.length} Software-/Tool-Kosten erkannt. Prüfe regelmäßig, ob alle Tools aktiv genutzt werden.`
  }

  if (expenses.length > incomes.length && incomes.length > 0) {
    return 'Du hast mehr Ausgaben als Einnahmen erfasst. Prüfe offene Rechnungen und wiederkehrende Kosten.'
  }

  return 'Deine Finanzen wirken aktuell stabil. Behalte Rücklagen, Fixkosten und neue Ausgaben weiter im Blick.'
}

export function MorningBriefing() {
  const { summary, expenses, incomes, userName, userStatus, industry } =
    useFinance()

  const recurringExpenses = findRecurringExpenses(expenses)
  const softwareExpenses = getSoftwareExpenses(expenses)
  const financeScore = getFinanceScore(summary, expenses, incomes)
  const taxReserve = summary.balance > 0 ? summary.balance * 0.3 : 0

  const tip = getMainTip({
    summary,
    expenses,
    incomes,
    userStatus,
    industry,
  })

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">
        Heute für dich
      </p>

      <h2 className="mt-3 text-2xl font-black text-slate-950">
        {getGreeting()}, {userName || 'Julia'} 🌸
      </h2>

      <div className="mt-5 rounded-[2rem] bg-violet-600 p-5 text-white">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
          Aktueller Überschuss
        </p>

        <p className="mt-2 text-3xl font-black">
          {formatEuro(summary.balance)}
        </p>

        <p className="mt-2 text-sm font-bold text-white/80">
          Einnahmen {formatEuro(summary.totalIncomes)} · Ausgaben{' '}
          {formatEuro(summary.totalExpenses)}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-emerald-50 p-4">
          <p className="text-[10px] font-black uppercase text-emerald-700">
            Finanzgesundheit
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-800">
            {financeScore}/100
          </p>
          <p className="mt-1 text-xs font-bold text-slate-600">
            {financeScore >= 80
              ? 'Stabil'
              : financeScore >= 50
              ? 'Beobachten'
              : 'Achtung'}
          </p>
        </div>

        <div className="rounded-2xl bg-amber-50 p-4">
          <p className="text-[10px] font-black uppercase text-amber-700">
            Rücklage
          </p>
          <p className="mt-1 text-2xl font-black text-amber-800">
            {formatEuro(taxReserve)}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-600">
            Orientierung
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-violet-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">
          Mila Tipp ✨
        </p>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">
          {tip}
        </p>
      </div>

      {(recurringExpenses.length > 0 || softwareExpenses.length > 0) && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-blue-50 p-4">
            <p className="text-[10px] font-black uppercase text-blue-700">
              Wiederkehrend
            </p>
            <p className="mt-1 text-xl font-black text-blue-800">
              {recurringExpenses.length}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-600">
              Muster erkannt
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase text-slate-600">
              Tools
            </p>
            <p className="mt-1 text-xl font-black text-slate-800">
              {softwareExpenses.length}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-600">
              Softwarekosten
            </p>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Mila gibt dir Orientierung für bessere Entscheidungen. Keine
        Steuerberatung.
      </p>
    </section>
  )
}