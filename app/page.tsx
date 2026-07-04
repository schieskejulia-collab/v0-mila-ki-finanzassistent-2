'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useFinance } from '@/lib/store'
import {
  calculatePayments,
  calculateReserve,
  calculateFinanceScore,
  calculateTrafficLight,
} from '@/lib/calculations'
import { getEntryCategory } from '@/lib/mila-classifier'
function formatEuro(value: number) {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

// --- HELFER-FUNKTIONEN ---
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
  if (!expenses || !Array.isArray(expenses)) return []
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

function getSoftwareExpenses(expenses: any[]) {
  if (!expenses || !Array.isArray(expenses)) return []
  return expenses.filter((expense) => getEntryCategory(expense) === 'software')
}

function getMainTip({ summary, expenses, incomes, userStatus, industry }: any) {
  if (!summary) return 'Lade deine Finanzdaten...'
  const balance = Number(summary.balance || 0)
  const recurring = findRecurringExpenses(expenses || [])
  const software = getSoftwareExpenses(expenses || [])
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
  const { summary, expenses, incomes, userName, userStatus, industry, vatStatus, isLoggedIn } = useFinance()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // 🛡️ SICHERER LADEZUSTAND (Verhindert fehlerhafte Redirects beim Hydrieren)
  if (!isClient || !summary) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-medium">Mila lädt deine Schaltzentrale...</p>
        </div>
      </div>
    )
  }

  // --- BERECHNUNGEN (VOLLSTÄNDIG WIEDERHERGESTELLT) ---
  const recurringExpenses = findRecurringExpenses(expenses || [])
const softwareExpenses = getSoftwareExpenses(expenses || [])

const payments = calculatePayments(incomes || [])

const openCount = payments.openCount
const overdueCount = payments.overdueCount
const totalOpenAmount = payments.openAmount
const totalOverdueAmount = payments.overdueAmount

const taxReserve = calculateReserve(summary.balance)

const financeScore = calculateFinanceScore({
  balance: summary.balance,
  totalIncomes: summary.totalIncomes,
  totalExpenses: summary.totalExpenses,
  openCount,
  overdueCount,
})

const baseTrafficLight = calculateTrafficLight(financeScore, summary.balance)

let trafficLight = {
  status: baseTrafficLight.status,
  color: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  dot: 'bg-emerald-500',
}

if (baseTrafficLight.level === 'danger') {
  trafficLight = {
    status: baseTrafficLight.status,
    color: 'bg-rose-50 border-rose-200 text-rose-900',
    dot: 'bg-rose-500',
  }
}

if (baseTrafficLight.level === 'warning') {
  trafficLight = {
    status: baseTrafficLight.status,
    color: 'bg-amber-50 border-amber-200 text-amber-900',
    dot: 'bg-amber-500',
  }
}
const anchorMessage =
  overdueCount > 0
    ? `Es gibt ${overdueCount} überfällige Forderung(en). Kein Drama — aber das ist heute deine wichtigste Baustelle.`
    : openCount > 0
    ? `Du hast ${openCount} offene Einnahme(n). Such dir heute nur eine davon aus und prüfe sie zuerst.`
    : summary.balance > 0
    ? 'Dein Cashflow wirkt stabil. Nutze den ruhigen Moment, um Rücklagen und nächste Zahlungen im Blick zu behalten.'
    : 'Heute geht es nicht um Perfektion. Wir sortieren Schritt für Schritt, was wirklich wichtig ist.'
  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-24 font-sans antialiased text-slate-900">
      
      {/* Rotes Warnbanner oben */}
      
      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">

        {/* --- MAIN HEADER BLOCK & MORNING BRIEFING --- */}
        <section className="rounded-[2rem] bg-white p-5 border border-slate-100 shadow-sm space-y-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-600">Heute für dich</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 flex items-center gap-2">
              {getGreeting()}, {userName || 'Julia'} 🌸
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Status: <span className="font-semibold capitalize">{userStatus}</span> ({industry === 'webdesigner' ? 'Webdesign' : industry}) · <span className="font-semibold">{vatStatus === 'kleinunternehmer' ? 'Kleinunternehmer' : 'Regelbest.'}</span>
            </p>
<div className="rounded-2xl bg-violet-50 p-4 border border-violet-100">
  <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">
    🪬 Heute wichtig
  </p>

  <p className="mt-2 text-sm font-bold leading-relaxed text-slate-800">
    {overdueCount > 0
      ? `Du hast ${overdueCount} überfällige Einnahme(n) über ${formatEuro(totalOverdueAmount)}. Das sollte heute zuerst geprüft werden.`
      : openCount > 0
      ? `Du wartest aktuell auf ${openCount} Zahlungseingang${openCount === 1 ? '' : 'e'} über ${formatEuro(totalOpenAmount)}. Prüfe heute, was davon schon erledigt ist.`
      : 'Heute sind keine Zahlungseingänge offen. Dein Fokus darf auf Rücklagen und neuen Buchungen liegen.'}
  </p>

  <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-600">
    Du musst nicht alles auf einmal lösen. Mila zeigt dir den nächsten sinnvollen Schritt.
  </p>
</div>
          </div>

          {/* Lila Hauptkarte */}
          <div className="rounded-[2rem] bg-purple-600 p-5 text-white shadow-md shadow-purple-100">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Aktueller Überschuss</p>
            <p className="mt-1 text-3xl font-black">{formatEuro(summary.balance)}</p>
            <p className="mt-2 text-xs font-bold text-white/80">
              Einnahmen {formatEuro(summary.totalIncomes)} · Ausgaben {formatEuro(summary.totalExpenses)}
            </p>
          </div>

          {/* Score & Rücklage Grids */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-100">
              <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Finanzgesundheit</p>
              <p className="mt-1 text-2xl font-black text-emerald-800">{financeScore}/100</p>
              <p className="mt-0.5 text-xs font-bold text-slate-600">
                {financeScore >= 80 ? '🟢 Stabil' : financeScore >= 50 ? '🟡 Beobachten' : '🔴 Achtung'}
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 p-4 border border-amber-100">
              <p className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Rücklage</p>
              <p className="mt-1 text-2xl font-black text-amber-800">{formatEuro(taxReserve)}</p>
              <p className="mt-0.5 text-xs font-bold text-slate-600">Orientierung</p>
            </div>
          </div>
</section>

{/* --- MILA HAT ETWAS GEFUNDEN --- */}

<div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">

  <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">

    🚨 Mila hat etwas gefunden

  </h2>

  <div className="space-y-3 text-xs text-slate-700 leading-relaxed">

    {overdueCount > 0 && (

      <div className="rounded-2xl bg-rose-50 border border-rose-100 p-3">

        <p className="font-black text-rose-700">

          🚨 Überfällige Zahlung

        </p>

        <p className="mt-1 font-semibold text-slate-700">

          {overdueCount} Einnahme(n) sind überfällig. Bitte zuerst erinnern oder Status prüfen.

        </p>

      </div>

    )}

    {openCount > 0 && (

      <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3">

        <p className="font-black text-amber-700">

          📥 Ausstehende Zahlungseingänge

        </p>

        <p className="mt-1 font-semibold text-slate-700">

         Du wartest noch auf {openCount} Zahlungseingang{openCount === 1 ? '' : 'e'} über {formatEuro(totalOpenAmount)}.

        </p>

      </div>

    )}

    {recurringExpenses.length > 0 && (

      <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3">

        <p className="font-black text-blue-700">

          💡 Wiederkehrende Ausgabe

        </p>

        <p className="mt-1 font-semibold text-slate-700">

          Mila erkennt {recurringExpenses.length} wiederkehrende Kosten. Prüfe, ob du sie wirklich noch brauchst.

        </p>

      </div>

    )}

    {softwareExpenses.length > 0 && (

      <div className="rounded-2xl bg-violet-50 border border-violet-100 p-3">

        <p className="font-black text-violet-700">

          💻 Software & Tools

        </p>

        <p className="mt-1 font-semibold text-slate-700">

          {softwareExpenses.length} Tool-Kosten erkannt. Gerade bei KI-Tools lohnt sich regelmäßiges Aufräumen.

        </p>

      </div>

    )}

    {openCount === 0 &&

      overdueCount === 0 &&

      recurringExpenses.length === 0 &&

      softwareExpenses.length === 0 && (

        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3">

          <p className="font-black text-emerald-700">

            🟢 Keine dringenden Auffälligkeiten

          </p>

          <p className="mt-1 font-semibold text-slate-700">

            Mila hat aktuell nichts Kritisches gefunden. Behalte Rücklage und nächste Zahlungen im Blick.

          </p>

        </div>

      )}

  </div>

</div>

        {/* --- PRIORITÄT 2: MILA-AMPEL --- */}
        <div className="space-y-2">
          <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400 px-1">
            🥈 Priorität 2 – Mila-Ampel
          </h2>
          <div className={`p-4 rounded-xl border text-xs font-bold shadow-sm flex items-center gap-2.5 transition-all ${trafficLight.color}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${trafficLight.dot} animate-pulse`}></span>
            {trafficLight.status}
          </div>
        </div>

        {/* --- PRIORITÄT 3: KI-ERKENNTNISSE --- */}
<div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
  <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400">
    🥉 Priorität 3 – KI-Erkenntnisse
  </h2>

  <ul className="space-y-3 text-xs text-slate-700 leading-relaxed">
    <li className="flex gap-2.5">
      <span>📊</span>
      <span>
        Mila erkennt aktuell {recurringExpenses.length} wiederkehrende Ausgabe(n)
        und {softwareExpenses.length} Software-/Tool-Kosten.
      </span>
    </li>
  </ul>
</div>

        {/* Chat-Anker Link */}
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
