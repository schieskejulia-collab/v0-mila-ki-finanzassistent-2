'use client'

import { useFinance } from '../../lib/store'

function formatEuro(value: number) {
  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

export function MorningBriefing() {
  const { summary, expenses, incomes, userName } = useFinance()

  const tip =
    summary.balance < 0
      ? 'Deine Ausgaben liegen über deinen Einnahmen.'
      : expenses.length > incomes.length
      ? 'Prüfe offene Rechnungen und wiederkehrende Kosten.'
      : 'Deine Finanzen wirken aktuell stabil.'

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
          Mila Tipp
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-700">
          {tip}
        </p>
      </div>
    </section>
  )
}