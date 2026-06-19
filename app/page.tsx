'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useFinance } from '@/lib/store'
import { getMilaInsights } from '@/lib/mila-insights'
import { BookingForm } from '@/components/ui/booking-form'
import { TaxCard } from '@/components/ui/tax-card'

const statuses = ['angestellt', 'selbstständig', 'freelancer', 'kleinunternehmer'] as const

function formatEuro(value: number) {
  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

export default function HomePage() {
  const {
    summary,
    userStatus,
    setUserStatus,
    expenses,
    incomes,
    userName,
    budgetStatus,
    industry,
    setIndustry,
  } = useFinance()

  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    if (setUserStatus && userStatus !== 'freelancer') {
      setUserStatus('freelancer')
    }
  }, [setUserStatus, userStatus])

  if (!isMounted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbf9ff] p-6 text-slate-950">
        <p className="animate-pulse text-sm font-black text-violet-700">
          Mila lädt deine Daten...
        </p>
      </main>
    )
  }

  const insights = getMilaInsights(incomes, expenses, userStatus, industry)
  const topInsights = insights.slice(0, 3)

  const taxReserve = summary.balance > 0 ? summary.balance * 0.3 : 0

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
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">
              Mila Finanz-Cockpit
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Hallo {userName || 'Julia'} 👋
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {userStatus} · {industry || 'Branche wählen'}
            </p>
          </div>

          <div className="rounded-3xl bg-emerald-50 px-4 py-3 text-right">
            <p className="text-[10px] font-black uppercase text-emerald-700">
              Score
            </p>
            <p className="text-2xl font-black text-emerald-800">
              {score}/100
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] bg-violet-600 p-5 text-white">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-100">
            Überschuss
          </p>
          <p className="mt-2 text-4xl font-black">
            {formatEuro(summary.balance)}
          </p>
          <p className="mt-2 text-sm font-semibold text-violet-100">
            Empfohlene Rücklage: {formatEuro(taxReserve)}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-[10px] font-black uppercase text-emerald-700">
              Einnahmen
            </p>
            <p className="mt-1 text-xl font-black text-emerald-800">
              {formatEuro(summary.totalIncomes)}
            </p>
            <p className="text-xs font-semibold text-emerald-700/70">
              {incomes.length} Buchungen
            </p>
          </div>

          <div className="rounded-2xl bg-rose-50 p-4">
            <p className="text-[10px] font-black uppercase text-rose-700">
              Ausgaben
            </p>
            <p className="mt-1 text-xl font-black text-rose-800">
              {formatEuro(summary.totalExpenses)}
            </p>
            <p className="text-xs font-semibold text-rose-700/70">
              {expenses.length} Belege
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          {statuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setUserStatus(status)}
              className={
                userStatus === status
                  ? 'rounded-2xl bg-violet-600 px-3 py-3 text-[10px] font-black uppercase text-white shadow-sm'
                  : 'rounded-2xl bg-violet-50 px-3 py-3 text-[10px] font-black uppercase text-violet-700'
              }
            >
              {status}
            </button>
          ))}
        </div>

        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value as any)}
          className="mt-4 w-full rounded-2xl border border-violet-100 bg-white p-3 text-sm font-semibold text-slate-700 shadow-sm"
        >
          <option value="webdesigner">🎨 Webdesigner</option>
          <option value="fotograf">📸 Fotograf</option>
          <option value="coach">🎓 Coach</option>
          <option value="handwerker">🧰 Handwerker</option>
          <option value="restaurant">🍽️ Gastronomie</option>
          <option value="ecommerce">🛒 E-Commerce</option>
          <option value="berater">💼 Berater</option>
          <option value="sonstiges">✨ Sonstiges</option>
        </select>
      </section>

      {topInsights.length > 0 && (
        <section className="rounded-[2rem] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
            ✨ Heute wichtig
          </h2>

          <div className="mt-4 space-y-3">
            {topInsights.map((item) => (
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
      )}

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-slate-500">
          Neue Buchung
        </h2>
        <BookingForm />
      </section>

      <TaxCard />

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-slate-500">
          Budget-Ampel
        </h2>

        <div className="space-y-3">
          <div className="text-xl font-black">
            {percent >= 100
              ? '🔴 Budget überschritten'
              : percent >= 80
              ? '🟡 Kategorien beobachten'
              : '🟢 Alles im grünen Bereich'}
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