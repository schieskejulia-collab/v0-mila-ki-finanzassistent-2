'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFinance } from '@/lib/store'
import { getMilaInsights } from '@/lib/mila-insights'
import { TaxCard } from '@/components/ui/tax-card'

const industries = [
  ['webdesigner', '🎨 Webdesigner'],
  ['fotograf', '📸 Fotograf'],
  ['coach', '🎓 Coach'],
  ['handwerker', '🧰 Handwerker'],
  ['restaurant', '🍽️ Gastronomie'],
  ['ecommerce', '🛒 E-Commerce'],
  ['berater', '💼 Berater'],
  ['sonstiges', '✨ Sonstiges'],
] as const

function formatEuro(value: number) {
  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function niceStatus(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function niceIndustry(value: string) {
  return industries.find(([key]) => key === value)?.[1] || '✨ Sonstiges'
}

export default function HomePage() {
  const router = useRouter()

  const {
    summary,
    userStatus,
    expenses,
    incomes,
    userName,
    budgetStatus,
    industry,
  } = useFinance()

  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbf9ff] p-6 text-slate-950">
        <p className="animate-pulse text-sm font-black text-violet-700">
          Mila lädt deine Daten...
        </p>
      </main>
    )
  }

  const taxReserve = summary.balance > 0 ? summary.balance * 0.3 : 0

  const openIncomes = incomes.filter((income: any) => {
    const status = String(income.status || 'offen').toLowerCase()
    return status !== 'bezahlt'
  })

  const overdueIncomes = openIncomes.filter((income: any) => {
    if (!income.due_date) return false

    const due = new Date(income.due_date)
    const today = new Date()

    due.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)

    return due < today
  })

  const paidIncomes = incomes.filter(
    (income: any) => String(income.status || '').toLowerCase() === 'bezahlt'
  )

  const openIncomeTotal = openIncomes.reduce(
    (sum: number, income: any) => sum + Number(income.amount || 0),
    0
  )

  const overdueIncomeTotal = overdueIncomes.reduce(
    (sum: number, income: any) => sum + Number(income.amount || 0),
    0
  )

  const insights = getMilaInsights(incomes, expenses, userStatus, industry)
  const displayInsights = insights
    .filter((item: any) => !item.title?.toLowerCase().includes('offene einnahmen'))
    .slice(0, 2)

  const totalLimit = budgetStatus.reduce((sum, b) => sum + b.limit, 0)
  const totalSpent = budgetStatus.reduce((sum, b) => sum + b.spent, 0)
  const percent = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0

  const score =
    summary.balance < 0 ? 45 :
    percent >= 90 ? 65 :
    summary.balance > 1000 ? 90 :
    80

  return (
    <main className="min-h-screen space-y-5 bg-[#fbf9ff] p-4 pb-40 text-slate-950">
      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-500">
              Mila Finanz-Cockpit
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight">
              Hallo {userName || 'Julia'} 👋
            </h1>

            <p className="mt-2 text-sm font-bold text-slate-500">
              {niceStatus(userStatus)} · {niceIndustry(industry)}
            </p>
          </div>

          <div className="rounded-3xl bg-emerald-50 px-5 py-4 text-center">
            <p className="text-[10px] font-black uppercase text-emerald-700">
              Score
            </p>
            <p className="text-2xl font-black text-emerald-800">
              {score}/100
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[2rem] bg-violet-600 p-5 text-white">
          <p className="text-xs font-black uppercase tracking-[0.25em]">
            Überschuss
          </p>
          <p className="mt-2 text-4xl font-black">
            {formatEuro(summary.balance)}
          </p>
          <p className="mt-2 text-sm font-bold text-white/80">
            Empfohlene Rücklage: {formatEuro(taxReserve)}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-emerald-50 p-4">
            <p className="text-[10px] font-black uppercase text-emerald-700">
              Einnahmen
            </p>
            <p className="mt-2 text-2xl font-black text-emerald-700">
              {formatEuro(summary.totalIncomes)}
            </p>
            <p className="text-xs font-bold text-emerald-700">
              {incomes.length} Buchungen
            </p>
          </div>

          <div className="rounded-3xl bg-rose-50 p-4">
            <p className="text-[10px] font-black uppercase text-rose-700">
              Ausgaben
            </p>
            <p className="mt-2 text-2xl font-black text-rose-700">
              {formatEuro(summary.totalExpenses)}
            </p>
            <p className="text-xs font-bold text-rose-700">
              {expenses.length} Belege
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
          ✨ Heute wichtig
        </h2>

        <div className="mt-4 space-y-3">
          {openIncomes.length > 0 && (
            <Link
              href="/buchungen"
              className="block rounded-3xl bg-amber-50 p-4"
            >
              <p className="text-lg font-black text-slate-950">
                📄 Offene Einnahmen
              </p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                Du hast {openIncomes.length} offene Einnahme
                {openIncomes.length === 1 ? '' : 'n'} im Wert von{' '}
                <strong>{formatEuro(openIncomeTotal)}</strong>.
              </p>
            </Link>
          )}

          {overdueIncomes.length > 0 && (
            <button
              type="button"
              onClick={() => router.push('/buchungen?status=ueberfaellig')}
              className="block w-full rounded-3xl bg-rose-50 p-4 text-left"
            >
              <p className="text-lg font-black text-rose-700">
                🔴 Überfällige Einnahmen
              </p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-rose-700">
                {overdueIncomes.length} Einnahme
                {overdueIncomes.length === 1 ? ' ist' : 'n sind'} überfällig:{' '}
                <strong>{formatEuro(overdueIncomeTotal)}</strong>.
              </p>
            </button>
          )}

          {displayInsights.map((item: any) => (
            <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-base font-black text-slate-950">
                {item.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {item.message}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-black">
          Neue Buchung
        </h2>

        <Link
          href="/neue-buchungen"
          className="block rounded-2xl bg-violet-600 py-4 text-center text-lg font-black text-white shadow-sm"
        >
          ➕ Neue Buchung erfassen
        </Link>
      </section>

      <TaxCard />

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-slate-500">
          Budget-Ampel
        </h2>

        <div className="space-y-3">
          <div className="text-xl font-black">
            {overdueIncomes.length > 0
              ? '🔴 Einnahmen überfällig'
              : openIncomes.length > 0
              ? '🟡 Offene Einnahmen prüfen'
              : percent >= 100
              ? '🔴 Budget überschritten'
              : percent >= 80
              ? '🟡 Kategorien beobachten'
              : '🟢 Alles im grünen Bereich'}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => router.push('/buchungen?status=offen')}
              className="rounded-3xl bg-amber-50 p-3 text-left"
            >
              <p className="text-[10px] font-black uppercase text-amber-700">
                Offen
              </p>
              <p className="mt-1 text-lg font-black text-slate-950">
                {openIncomes.length}
              </p>
            </button>

            <button
              type="button"
              onClick={() => router.push('/buchungen?status=bezahlt')}
              className="rounded-3xl bg-emerald-50 p-3 text-left"
            >
              <p className="text-[10px] font-black uppercase text-emerald-700">
                Bezahlt
              </p>
              <p className="mt-1 text-lg font-black text-slate-950">
                {paidIncomes.length}
              </p>
            </button>

            <button
              type="button"
              onClick={() => router.push('/buchungen?status=ueberfaellig')}
              className="rounded-3xl bg-rose-50 p-3 text-left"
            >
              <p className="text-[10px] font-black uppercase text-rose-700">
                Überfällig
              </p>
              <p className="mt-1 text-lg font-black text-slate-950">
                {overdueIncomes.length}
              </p>
            </button>
          </div>

          <div className="text-sm text-slate-600">
            Verwendet: {formatEuro(totalSpent)}
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-violet-600"
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </div>
        </div>
      </section>

      <section className="relative z-40 grid grid-cols-2 gap-3 pb-8">
        <Link
          href="/buchungen"
          className="flex items-center justify-center rounded-3xl bg-white p-4 text-sm font-black text-violet-700 shadow-sm active:bg-violet-50"
        >
          📒 Buchungen
        </Link>

        <Link
          href="/chat"
          className="flex items-center justify-center rounded-3xl bg-slate-950 p-4 text-sm font-black text-white shadow-sm active:bg-slate-800"
        >
          💬 Mila Chat
        </Link>
      </section>
    </main>
  )
}