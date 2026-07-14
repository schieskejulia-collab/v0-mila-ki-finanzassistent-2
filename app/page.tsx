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
import { getObligationInsights } from '@/lib/mila-obligation-insights'
import { getMilaAssistantFindings } from '@/lib/mila-assistant'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { estimateTaxProfile } from '@/lib/tax-profile'
import { MorningBriefing } from '@/components/ui/morning-briefing'
import { getMilaPatterns } from '@/lib/mila-patterns'
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
  const {
  summary,
  expenses,
  incomes,
  obligations,
  userName,
  userStatus,
  industry,
  vatStatus,
  isLoggedIn,
documents,
  taxClass,
  annualGross,
  annualProfit,
  federalState,
  churchTax,
  married,
  children,
  assemblyWork,
} = useFinance()
const [isClient, setIsClient] = useState(false)
const milaPatterns = getMilaPatterns(
  expenses,
  incomes,
  obligations
)
const router = useRouter()

useEffect(() => {
  async function checkLogin() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      router.push('/login')
      return
    }

    setIsClient(true)
  }

  checkLogin()
}, [router])
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
const openObligations = (obligations || []).filter(
  (item: any) => String(item.status || '').toLowerCase() !== 'bezahlt'
)
const today = new Date()
today.setHours(0, 0, 0, 0)

const overdueObligations = openObligations.filter((item: any) => {
  const dueDate = item.dueDate || item.due_date
  if (!dueDate) return false

  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  return due.getTime() < today.getTime()
})

const dueSoonObligations = openObligations.filter((item: any) => {
  const dueDate = item.dueDate || item.due_date
  if (!dueDate) return false

  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  const days =
    (due.getTime() - today.getTime()) /
    (1000 * 60 * 60 * 24)

  return days >= 0 && days <= 3
})

const inkassoObligations = openObligations.filter((item: any) => {
  const text = `${item.type || ''} ${item.title || ''} ${
    item.partner || item.creditor || ''
  }`.toLowerCase()

  return (
    text.includes('inkasso') ||
    text.includes('forderung')
  )
})
const assistantFindings = getMilaAssistantFindings({
  documents: documents || [],
  obligations: openObligations,
})
const taxProfile = estimateTaxProfile({
  userType: assemblyWork ? 'montagearbeiter' : userStatus,
  annualGrossSalary: Number(annualGross || 0),
  estimatedAnnualProfit: Number(annualProfit || 0),
  annualRevenueGross: summary.totalIncomes,
  vatStatus,
  federalState,
  churchTax,
  taxClass,
  isMarried: married,
  hasChildren: Number(children || 0) > 0,
  assemblyWork,
})

const deductibleExpenses = expenses
  .filter((expense) => {
    const category = String(expense.category || '').toLowerCase()

    return (
      category !== 'privat' &&
      category !== 'privat / nicht absetzbar' &&
      category !== 'nicht absetzbar'
    )
  })
  .reduce((sum, expense) => sum + Number(expense.amount || 0), 0)

const estimatedTaxableProfit = Math.max(
  0,
  summary.totalIncomes - deductibleExpenses
)

const reserveRate =
  taxProfile.reservePercent && taxProfile.reservePercent > 0
    ? taxProfile.reservePercent / 100
    : 0.125

const taxReserve = estimatedTaxableProfit * reserveRate

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
     <MorningBriefing />


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
          <p className="mt-0.5 text-xs font-bold text-slate-600">
  Empfohlene Steuer-Rücklage
</p>

<p className="mt-2 text-[10px] font-semibold leading-relaxed text-slate-500">
  Grundlage: {formatEuro(estimatedTaxableProfit)} ×{' '}
  {Math.round(reserveRate * 1000) / 10} %
</p>

<p className="mt-1 text-[10px] font-semibold leading-relaxed text-slate-500">
  Private Ausgaben mindern den steuerlichen Gewinn nicht.
</p>
            </div>
          </div>
</section>

{/* --- HEUTE WICHTIG --- */}

<div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">

  <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">

    💜 HEUTE WICHTIG

  </h2>

  <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
{assistantFindings.slice(0, 1).map((item) => (
  <div
    key={item.id}
    className={`rounded-2xl border p-3 ${
      item.priority === 'high'
        ? 'bg-rose-50 border-rose-100'
        : item.priority === 'medium'
        ? 'bg-amber-50 border-amber-100'
        : 'bg-violet-50 border-violet-100'
    }`}
  >
    <p className="font-black text-slate-800">{item.title}</p>
    <p className="mt-1 font-semibold text-slate-700">
      {item.message}
    </p>
  </div>
))}
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

   {recurringExpenses.length >= 2 && (
  <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3">
    <p className="font-black text-blue-700">
      {recurringExpenses.length >= 3
        ? '🔁 Wiederkehrende Ausgaben'
        : '💡 Möglicherweise wiederkehrend'}
    </p>

    <p className="mt-1 font-semibold text-slate-700">
      {recurringExpenses.length >= 3
        ? `Mila erkennt ${recurringExpenses.length} regelmäßige Kosten. Prüfe, ob du sie weiterhin brauchst.`
        : 'Diese Ausgabe wurde mehrfach erkannt. Mila beobachtet, ob daraus eine regelmäßige Zahlung wird.'}
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

  openObligations.length === 0 &&

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
{/* --- OFFENE AUFGABEN --- */}
<div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
    🧾 Offene Aufgaben
  </h2>

  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
    <div className="rounded-2xl bg-rose-50 p-3">
      <p className="text-xl font-black text-rose-700">
        {overdueObligations.length}
      </p>
      <p className="mt-1 text-[10px] font-bold text-rose-600">
        Überfällig
      </p>
    </div>

    <div className="rounded-2xl bg-amber-50 p-3">
      <p className="text-xl font-black text-amber-700">
        {dueSoonObligations.length}
      </p>
      <p className="mt-1 text-[10px] font-bold text-amber-600">
        Bald fällig
      </p>
    </div>

    <div className="rounded-2xl bg-violet-50 p-3">
      <p className="text-xl font-black text-violet-700">
        {inkassoObligations.length}
      </p>
      <p className="mt-1 text-[10px] font-bold text-violet-600">
        Forderungen
      </p>
    </div>
  </div>

  {openObligations.length === 0 && (
    <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
      🟢 Alle Verpflichtungen sind erledigt.
    </p>
  )}

  {openObligations.length > 0 && (
    <Link
      href="/verpflichtungen"
      className="mt-4 block rounded-2xl bg-purple-600 py-3 text-center text-xs font-black text-white"
    >
      Alle Verpflichtungen öffnen →
    </Link>
  )}
</div>
      {/* --- MILA-AMPEL --- */}
<div className="space-y-2">
  <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
    Mila-Ampel
  </h2>

  <div
    className={`flex items-center gap-2.5 rounded-xl border p-4 text-xs font-bold shadow-sm transition-all ${trafficLight.color}`}
  >
    <span
      className={`h-2.5 w-2.5 rounded-full ${trafficLight.dot} animate-pulse`}
    />
    {trafficLight.status}
  </div>
</div>

{/* --- KI-ERKENNTNISSE --- */}
<div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">

  <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400">
    📊 KI-Erkenntnisse
  </h2>

  {milaPatterns.length === 0 ? (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
      <p className="text-xs font-semibold text-slate-600">
        Mila sammelt noch Daten. Mit weiteren Buchungen erkennt sie automatisch
        wiederkehrende Rechnungen, Versicherungen und dein persönliches
        Kaufverhalten.
      </p>
    </div>
  ) : (
    <div className="space-y-3">

      {milaPatterns.map((pattern) => (
        <div
          key={pattern.id}
          className="rounded-2xl border border-violet-100 bg-violet-50 p-4"
        >
          <p className="font-black text-violet-800">
            {pattern.title}
          </p>

          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-700">
           {pattern.description}
          </p>
        </div>
      ))}

    </div>
  )}

</div>

{/* --- CHAT-ANKER --- */}
<Link
  href="/chat"
  className="block rounded-xl bg-purple-600 py-4 text-center text-white shadow-md shadow-purple-100 transition active:scale-95 hover:bg-purple-700"
>
  <span className="block text-sm font-bold">
    💬 Mit Mila sprechen
  </span>

  <span className="mt-1 block text-[10px] font-semibold text-white/75">
    Dein persönlicher Finanzanker
  </span>
</Link>

<p className="pt-2 text-center text-[10px] leading-relaxed text-slate-400">
  Mila gibt dir Orientierung für bessere Entscheidungen. Keine Steuerberatung.
</p>
      </div>
    </div>
  )
}
