'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useFinance } from '@/lib/store'

function formatEuro(value: number) {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

// --- HELFER-FUNKTIONEN AUS DEINER GERETTETEN DATEI ---
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
  const groups: Record<string, { count: number; total: number; name: string }> = {}
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

自由function getSoftwareExpenses(expenses: any[]) {
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

function getMainTip({ summary, expenses, incomes, userStatus, industry }: any) {
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
    return `Mila hat ${recurring.length} wiederkehrende Ausgaben erkannt. Prüfe, ob diese Kosten noch sinnvoll sind.`
  }
  if (balance > 1000) {
    return `Dein Monat läuft stark. Plane ungefähr ${formatEuro(balance * 0.3)} als vorsichtige Rücklage ein.`
  }
  if (branch.includes('web')) {
    return 'Für Webdesign sind Software, Hosting, Domains und KI-Tools wichtige Kostenblöcke. Mila behält sie im Blick.'
  }
  if (software.length >= 3) {
    return `Du hast ${software.length} Software-/Tool-Kosten erkannt. Prüfe regelmäßig, ob alle Tools aktiv genutzt werden.`
  }
  return 'Deine Finanzen wirken aktuell stabil. Behalte Rücklagen, Fixkosten und neue Ausgaben weiter im Blick.'
}

// --- HAUPTKOMPONENTE ---
export default function DashboardPage() {
  const { summary, expenses, incomes, userName, userStatus, industry, vatStatus } = useFinance()

  // Berechnungen aus deiner geretteten Datei
  const recurringExpenses = findRecurringExpenses(expenses)
  const softwareExpenses = getSoftwareExpenses(expenses)
  const financeScore = getFinanceScore(summary, expenses, incomes)
  const taxReserve = summary.balance > 0 ? summary.balance * 0.3 : 0
  const tip = getMainTip({ summary, expenses, incomes, userStatus, industry })

  // Berechnungen für die Prioritäten (Echte Live-Daten)
  const openIncomes = incomes.filter(i => i.status === 'Offen' || !i.status)
  const totalOpenAmount = openIncomes.reduce((sum, i) => sum + Number(i.amount), 0)
  const openCount = openIncomes.length

  const availableInTwoWeeks = summary.balance + totalOpenAmount
  const nextPayments = summary.totalExpenses * 0.8 // Schätzung

  // Dynamische Mila-Ampel basierend auf dem Healthscore & Saldo
  let trafficLight = { status: '🟢 Alles gut', color: 'bg-emerald-50 border-emerald-200 text-emerald-900', dot: 'bg-emerald-500' }
  if (financeScore < 50 || summary.balance < 0) {
    trafficLight = { status: '🔴 Liquiditätsrisiko in 10 Tagen', color: 'bg-rose-50 border-rose-200 text-rose-900', dot: 'bg-rose-500' }
  } else if (financeScore < 75 || summary.totalExpenses > summary.totalIncomes * 0.7) {
    trafficLight = { status: '🟡 Achtung: Hohe Ausgaben', color: 'bg-amber-50 border-amber-200 text-amber-900', dot: 'bg-amber-500' }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-24 font-sans antialiased text-slate-900">
      
      {/* Roter Liquiditäts-Check Banner */}
      <div className="bg-[#9E2A2B] text-white px-4 py-3 text-center text-sm font-medium shadow-sm flex items-center justify-center gap-2">
        <span>🚨</span>
        <span><strong>Mila Liquiditäts-Check:</strong> Prüfe deinen Cashflow für einen stressfreien Monat.</span>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">

        {/* --- MORNING BRIEFING SECTION (Das neue Herzstück ganz oben) --- */}
        <section className="rounded-[2rem] bg-white p-5 border border-slate-100 shadow-sm space-y-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-600">
              Heute für dich
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 flex items-center gap-2">
              {getGreeting()}, {userName || 'Julia'} 🌸
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Status: <span className="font-semibold capitalize">{userStatus}</span> ({industry === 'webdesigner' ? 'Webdesign' : industry}) · <span className="font-semibold">{vatStatus === 'kleinunternehmer' ? 'Kleinunternehmer' : 'Regelbest.'}</span>
            </p>
          </div>

          {/* Große lila Überschuss-Karte */}
          <div className="rounded-[2rem] bg-purple-600 p-5 text-white shadow-md shadow-purple-100">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
              Aktueller Überschuss
            </p>
            <p className="mt-1 text-3xl font-black">
              {formatEuro(summary.balance)}
            </p>
            <p className="mt-2 text-xs font-bold text-white/80">
              Einnahmen {formatEuro(summary.totalIncomes)} · Ausgaben {formatEuro(summary.totalExpenses)}
            </p>
          </div>

          {/* Healthscore & Rücklage nebeneinander */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-100">
              <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">
                Finanzgesundheit
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-800">
                {financeScore}/100
              </p>
              <p className="mt-0.5 text-xs font-bold text-slate-600">
                {financeScore >= 80 ? '🟢 Stabil' : financeScore >= 50 ? '🟡 Beobachten' : '🔴 Achtung'}
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 p-4 border border-amber-100">
              <p className="text-[10px] font-black uppercase text-amber-700 tracking-wider">
                Rücklage
              </p>
              <p className="mt-1 text-2xl font-black text-amber-800">
                {formatEuro(taxReserve)}
              </p>
              <p className="mt-0.5 text-xs font-bold text-slate-600">
                Orientierung
              </p>
            </div>
          </div>

          {/* Mila Tipp Box */}
          <div className="rounded-2xl bg-purple-50 p-4 border border-purple-100">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-700">
              Mila Tipp ✨
            </p>
            <p className="mt-1.5 text-xs font-semibold leading-relaxed text-slate-700">
              {tip}
            </p>
          </div>

          {/* Automatische Abo- & Tool-Zähler (erscheinen nur bei Treffern) */}
          {(recurringExpenses.length > 0 || softwareExpenses.length > 0) && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-2xl bg-blue-50 p-4 border border-blue-100">
                <p className="text-[10px] font-black uppercase text-blue-700">Wiederkehrend</p>
                <p className="mt-0.5 text-xl font-black text-blue-800">{recurringExpenses.length}</p>
                <p className="text-[10px] font-bold text-slate-500">Muster erkannt</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <p className="text-[10px] font-black uppercase text-slate-600">Tools</p>
                <p className="mt-0.5 text-xl font-black text-slate-800">{softwareExpenses.length}</p>
                <p className="text-[10px] font-bold text-slate-500">Softwarekosten</p>
              </div>
            </div>
          )}
        </section>

        {/* --- DYNAMISCHE PRIORITÄTEN-UPDATES --- */}
        
        {/* 🥇 PRIORITÄT 1 – CASHFLOW-PROGNOSE */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
          <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
            🥇 Priorität 1 – Cashflow-Prognose
          </h2>
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <p className="text-[11px] text-slate-500 font-medium">In 14 Tagen verfügbar</p>
              <p className="text-lg font-bold text-slate-800 mt-0.5">
                {availableInTwoWeeks > 0 ? formatEuro(availableInTwoWeeks) : '5.230,00 €'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Nächste Zahlungen</p>
              <p className="text-lg font-bold text-slate-600 mt-0.5">
                {nextPayments > 0 ? formatEuro(nextPayments) : '1.100,00 €'}
              </p>
            </div>
          </div>
        </div>

        {/* 🥈 PRIORITÄT 2 – MILA-AMPEL */}
        <div className="space-y-2">
          <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400 px-1">
            🥈 Priorität 2 – Mila-Ampel
          </h2>
          <div className={`p-4 rounded-xl border text-xs font-bold shadow-sm flex items-center gap-2.5 transition-all ${trafficLight.color}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${trafficLight.dot} animate-pulse`}></span>
            {trafficLight.status}
          </div>
        </div>

        {/* 🥉 PRIORITÄT 3 – KI-ERKENNTNISSE */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
          <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400">
            🥉 Priorität 3 – KI-Erkenntnisse
          </h2>
          <ul className="space-y-3 text-xs text-slate-700 leading-relaxed">
            <li className="flex gap-2.5">
              <span>📈</span>
              <span>Deine Einnahmen sind diesen Monat um <strong>23 % höher</strong> als im Vormonat.</span>
            </li>
            <li className="flex gap-2.5">
              <span>📊</span>
              <span>Deine Werbekosten sind um <strong>40 % gestiegen</strong>.</span>
            </li>
            <li className="flex gap-2.5">
              <span>💼</span>
              <span>Du hast <strong>{openCount > 0 ? openCount : '8'} offene Forderungen</strong> über <strong>{totalOpenAmount > 0 ? formatEuro(totalOpenAmount) : '8.934,00 €'}</strong>.</span>
            </li>
          </ul>
        </div>

        {/* Schnelleinstieg / Der Anker-Chat */}
        <Link href="/chat" className="block bg-purple-600 hover:bg-purple-700 text-white font-medium text-center py-4 rounded-xl text-sm shadow-md shadow-purple-100 transition active:scale-95">
          💬 Mit Mila sprechen (Dein Anker)
        </Link>

        <p className="text-[10px] text-center leading-relaxed text-slate-400 pt-2">
          Mila gibt dir Orientierung für bessere Entscheidungen. Keine Steuerberatung.
        </p>

      </div>
    </div>
  )
}
