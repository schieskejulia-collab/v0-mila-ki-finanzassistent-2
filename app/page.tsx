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
import { getMilaFinanceAnalysis } from '@/lib/mila-finance-analysis'
import { getMilaForecast } from '@/lib/mila-forecast'
import { getMilaDailyInsight } from '@/lib/mila-daily-insight'
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
goals,
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
const openObligationAmount = openObligations.reduce(
  (sum: number, item: any) =>
    sum + Number(item.amount || 0),
  0
)

const availableAfterObligations =
  summary.balance - openObligationAmount
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
const dailyInsight = getMilaDailyInsight({
  expenses: expenses || [],
  incomes: incomes || [],
  obligations: obligations || [],
  goals: goals || [],
  taxReserve,
  availableAfterObligations,
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
const financeAnalysis = getMilaFinanceAnalysis({
  expenses: expenses || [],
  incomes: incomes || [],
  obligations: obligations || [],
  taxReserve,
})
const todayTask = (() => {
  if (overdueObligations.length > 0) {
    const item = overdueObligations[0] as any
const milaMood = (() => {
  if (overdueObligations.length > 0 || overdueCount > 0) {
    return {
      label: 'Heute aufmerksam',
      message:
        'Es gibt überfällige Zahlungen. Mila würde heute nur die wichtigste davon zuerst klären.',
      color:
        'border-rose-200 bg-rose-50 text-rose-900',
      dot: 'bg-rose-500',
      emoji: '🔴',
    }
  }

  if (dueSoonObligations.length > 0 || openCount > 0) {
    return {
      label: 'Heute im Blick behalten',
      message:
        'Es steht eine Zahlung oder ein offener Eingang an. Alles ist noch überschaubar.',
      color:
        'border-amber-200 bg-amber-50 text-amber-900',
      dot: 'bg-amber-500',
      emoji: '🟡',
    }
  }

  if (
    summary.balance > 0 &&
    availableAfterObligations >= 0 &&
    financeScore >= 70
  ) {
    return {
      label: 'Heute ruhig',
      message:
        'Deine finanzielle Lage wirkt stabil. Es gibt aktuell nichts Dringendes zu erledigen.',
      color:
        'border-emerald-200 bg-emerald-50 text-emerald-900',
      dot: 'bg-emerald-500',
      emoji: '🟢',
    }
  }

  if (summary.balance < 0 || availableAfterObligations < 0) {
    return {
      label: 'Heute vorsichtig',
      message:
        'Dein Spielraum ist gerade knapp. Größere Ausgaben würde Mila heute lieber vermeiden.',
      color:
        'border-rose-200 bg-rose-50 text-rose-900',
      dot: 'bg-rose-500',
      emoji: '🔴',
    }
  }

  return {
    label: 'Heute noch sortieren',
    message:
      'Mila sammelt noch Daten. Mit weiteren Buchungen wird die Einschätzung genauer.',
    color:
      'border-violet-200 bg-violet-50 text-violet-900',
    dot: 'bg-violet-500',
    emoji: '🟣',
  }
})()
    return {
      title: item.title || 'Überfällige Verpflichtung prüfen',
      message: `${formatEuro(
        Number(item.amount || 0)
      )} sind überfällig. Prüfe diese Zahlung zuerst.`,
      href: '/verpflichtungen',
      tone: 'danger' as const,
    }
  }

  if (dueSoonObligations.length > 0) {
    const sortedItems = [...dueSoonObligations].sort(
      (a: any, b: any) => {
        const aDate = new Date(
          a.dueDate || a.due_date || ''
        ).getTime()

        const bDate = new Date(
          b.dueDate || b.due_date || ''
        ).getTime()

        return aDate - bDate
      }
    )

    const item = sortedItems[0] as any
    const dueDate = item.dueDate || item.due_date || ''

    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const days = Math.round(
      (due.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    )

    const dueText =
      days === 0
        ? 'heute'
        : days === 1
          ? 'morgen'
          : `in ${days} Tagen`

    return {
      title: item.title || 'Nächste Verpflichtung prüfen',
      message: `${formatEuro(
        Number(item.amount || 0)
      )} werden ${dueText} fällig.`,
      href: '/verpflichtungen',
      tone: 'warning' as const,
    }
  }

  if (openCount > 0) {
    return {
      title: 'Offenen Zahlungseingang prüfen',
      message: `Du wartest noch auf ${formatEuro(
        totalOpenAmount
      )}. Prüfe heute einen offenen Eingang.`,
      href: '/finanzen',
      tone: 'info' as const,
    }
  }

  if (taxReserve > 0) {
    return {
      title: 'Steuer-Rücklage einplanen',
      message: `Plane ${formatEuro(
        taxReserve
      )} als Rücklage ein.`,
      href: '/finanzen',
      tone: 'good' as const,
    }
  }

  return null
})()
const forecast = getMilaForecast(
  incomes || [],
  expenses || []
)
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
    <MorningBriefing
  taxReserve={taxReserve}
  financeScore={financeScore}
  availableAfterObligations={availableAfterObligations}
/>

{/* --- MILA-STIMMUNG --- */}
<div
  className={`rounded-2xl border p-5 shadow-sm ${milaMood.color}`}
>
  <div className="flex items-center gap-3">
    <span
      className={`h-3 w-3 shrink-0 rounded-full ${milaMood.dot} animate-pulse`}
    />

    <div>
      <p className="text-xs font-black uppercase tracking-[0.2em] opacity-70">
        {milaMood.emoji} Mila heute
      </p>

      <p className="mt-1 text-xl font-black">
        {milaMood.label}
      </p>
    </div>
  </div>

  <p className="mt-3 text-sm font-semibold leading-relaxed opacity-80">
    {milaMood.message}
  </p>
</div>
{/* --- MILA HAT ETWAS ERKANNT --- */}
{dailyInsight && (
  <div
    className={`rounded-2xl border p-5 shadow-sm ${
      dailyInsight.type === 'warning'
        ? 'border-amber-200 bg-amber-50'
        : dailyInsight.type === 'good'
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-violet-200 bg-violet-50'
    }`}
  >
    <p
      className={`text-xs font-black uppercase tracking-[0.2em] ${
        dailyInsight.type === 'warning'
          ? 'text-amber-700'
          : dailyInsight.type === 'good'
            ? 'text-emerald-700'
            : 'text-violet-700'
      }`}
    >
      {dailyInsight.title}
    </p>

    <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-700">
      {dailyInsight.message}
    </p>
  </div>
)}
        {/* Lila Hauptkarte */}
<div className="rounded-[2rem] bg-purple-600 p-5 text-white shadow-md shadow-purple-100">
  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
    Aktueller Überschuss
  </p>

  <p className="mt-1 text-3xl font-black">
    {formatEuro(summary.balance)}
  </p>

  <p className="mt-2 text-xs font-bold text-white/80">
    Einnahmen {formatEuro(summary.totalIncomes)} · Ausgaben{' '}
    {formatEuro(summary.totalExpenses)}
  </p>

  {openObligations.length > 0 && (
    <div className="mt-4 rounded-2xl bg-white/10 p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-white/70">
        Offene Verpflichtungen
      </p>

      <p className="mt-1 text-lg font-black">
        {formatEuro(openObligationAmount)}
      </p>

      <p className="mt-1 text-xs font-bold text-white/80">
        Nach offenen Verpflichtungen verfügbar:{' '}
        {formatEuro(availableAfterObligations)}
      </p>
    </div>
  )}
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
<div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">

  <p className="text-[10px] font-black uppercase tracking-wider text-purple-600">
    🔮 Mila Forecast
  </p>

  <p className="mt-2 text-2xl font-black text-slate-900">
    {formatEuro(forecast.expectedBalance)}
  </p>

  <p className="mt-2 text-sm font-semibold text-slate-600">
    {forecast.message}
  </p>

</div>
            </div>
          </div>
</section>
{/* --- HEUTE ERLEDIGEN --- */}
{todayTask && (
  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">
          ✅ Heute erledigen
        </p>

        <p className="mt-2 text-xl font-black text-slate-950">
          {todayTask.title}
        </p>
      </div>

      <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500">
        ca. 2 Min.
      </span>
    </div>

    <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
      {todayTask.message}
    </p>

    <Link
      href={todayTask.href}
      className={`mt-4 block rounded-2xl py-3 text-center text-sm font-black ${
        todayTask.tone === 'danger'
          ? 'bg-rose-600 text-white'
          : todayTask.tone === 'warning'
            ? 'bg-amber-500 text-white'
            : todayTask.tone === 'good'
              ? 'bg-emerald-600 text-white'
              : 'bg-violet-600 text-white'
      }`}
    >
      Jetzt ansehen →
    </Link>
  </div>
)}
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

  {obligations.length === 0 ? (
    <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-600">
      📝 Noch keine Verpflichtungen angelegt.
    </p>
  ) : openObligations.length === 0 ? (
    <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
      🟢 Alle Verpflichtungen sind erledigt.
    </p>
  ) : (
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
<div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
    📊 KI-Erkenntnisse
  </h2>

  {financeAnalysis.length === 0 ? (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-semibold leading-relaxed text-slate-600">
        Mila sammelt noch Daten. Mit weiteren Buchungen erkennt sie automatisch
        wiederkehrende Rechnungen, Versicherungen und deinen finanziellen
        Spielraum.
      </p>
    </div>
  ) : (
    <div className="space-y-3">
      {financeAnalysis.map((item) => {
        const style =
          item.type === 'danger'
            ? 'border-rose-100 bg-rose-50'
            : item.type === 'warning'
              ? 'border-amber-100 bg-amber-50'
              : item.type === 'good'
                ? 'border-emerald-100 bg-emerald-50'
                : 'border-violet-100 bg-violet-50'

        const titleColor =
          item.type === 'danger'
            ? 'text-rose-800'
            : item.type === 'warning'
              ? 'text-amber-800'
              : item.type === 'good'
                ? 'text-emerald-800'
                : 'text-violet-800'

        return (
          <div
            key={item.id}
            className={`rounded-2xl border p-4 ${style}`}
          >
            <p className={`font-black ${titleColor}`}>
              {item.title}
            </p>

            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-700">
              {item.message}
            </p>
          </div>
        )
      })}
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
