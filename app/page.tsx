'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useFinance } from '@/lib/store'
import { MorningBriefing } from '@/components/ui/morning-briefing'

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
    milaFeedback,
    expenses,
    incomes,
    userName,
    budgetStatus,
    addExpense,
    addIncome,
  } = useFinance()

  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    // Falls beim ersten Laden noch ein alter Status feststeckt, 
    // setzen wir ihn einmalig sauber auf freelancer.
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

  return (
    <main className="min-h-screen space-y-6 bg-[#fbf9ff] p-4 text-slate-950">
      <section className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            Hallo {userName || 'Julia'} 👋
          </h1>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-violet-500">
            Dein Finanz-Überblick
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white text-xl shadow-sm">
          ✨
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Steuerlicher Status
          </h2>
          <span className="rounded-full bg-violet-100 px-3 py-1 text-[10px] font-black text-violet-700">
            Live
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {statuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setUserStatus(status)}
              className={
                userStatus === status
                  ? 'rounded-2xl bg-violet-600 px-3 py-3 text-[10px] font-black uppercase tracking-tight text-white shadow-sm transition-all'
                  : 'rounded-2xl bg-violet-50 px-3 py-3 text-[10px] font-black uppercase tracking-tight text-violet-700 transition-all'
              }
            >
              {status}
            </button>
          ))}
        </div>
      </section>
<MorningBriefing />
      <section className="rounded-r-[2rem] border-l-4 border-violet-600 bg-violet-100 p-5 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-700">
          Mila denkt mit
        </p>
        <p className="mt-2 text-base font-semibold italic leading-snug text-slate-900">
          „{milaFeedback || 'Ich bin bereit für deine Belege!'}“
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="rounded-[2rem] bg-emerald-50 p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
            Einnahmen
          </p>
          <p className="mt-2 text-2xl font-black text-emerald-700">
            {formatEuro(summary.totalIncomes)}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600/70">
            {incomes.length} Buchungen
          </p>
        </div>

        <div className="rounded-[2rem] bg-rose-50 p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600">
            Ausgaben
          </p>
          <p className="mt-2 text-2xl font-black text-rose-700">
            {formatEuro(summary.totalExpenses)}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-rose-600/70">
            {expenses.length} Belege
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          Kontostand
        </p>
        <p
          className={
            summary.balance >= 0
              ? 'mt-2 text-4xl font-black text-emerald-700'
              : 'mt-2 text-4xl font-black text-rose-700'
          }
        >
          {formatEuro(summary.balance)}
        </p>
      </section>


      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-slate-500">
          Budget-Check
        </h2>

        <div className="space-y-4">
          {budgetStatus.map((budget) => (
            <div key={budget.category} className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span>{budget.category}</span>
                <span className={budget.remaining < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                  {formatEuro(budget.remaining)} {budget.remaining < 0 ? 'überzogen' : 'übrig'}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={
                    budget.remaining < 0
                      ? 'h-full rounded-full bg-rose-500'
                      : 'h-full rounded-full bg-violet-600'
                  }
                  style={{
                    width: `${Math.min(100, Math.max(0, budget.percent))}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 pb-4">
        {/* FIX: Zeigt jetzt auf das korrekte Verzeichnis deines neuen Formulars ohne Plural-S-Fehler */}
        <Link
          href="/neue-buchung"
          className="flex items-center justify-center rounded-3xl bg-violet-600 p-4 text-sm font-black text-white shadow-sm active:bg-violet-700"
        >
          + Neue Buchung
        </Link>

        <Link
          href="/buchungen"
          className="flex items-center justify-center rounded-3xl bg-white p-4 text-sm font-black text-violet-700 shadow-sm active:bg-violet-50"
        >
          📒 Buchungen
        </Link>
      </section>
    </main>
  )
}
