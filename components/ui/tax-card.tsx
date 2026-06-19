'use client'

import { useFinance } from '@/lib/store'

function formatEuro(value: number) {
  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

export function TaxCard() {
  const { summary, userStatus } = useFinance()

  const profit = summary.balance
  const taxReserve = profit > 0 ? profit * 0.3 : 0

  const status =
    profit <= 0
      ? 'Noch keine Rücklage nötig'
      : taxReserve < 100
      ? 'Kleine Rücklage reicht aktuell'
      : 'Rücklage einplanen'

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
        Steuer-Cockpit
      </p>

      <h2 className="mt-3 text-2xl font-black text-slate-950">
        {formatEuro(taxReserve)}
      </h2>

      <p className="mt-1 text-sm font-semibold text-slate-500">
        empfohlene Rücklage bei ca. 30%
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-violet-50 p-4">
          <p className="text-[10px] font-black uppercase text-violet-600">
            Gewinn
          </p>
          <p className="mt-1 text-sm font-black text-violet-800">
            {formatEuro(profit)}
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 p-4">
          <p className="text-[10px] font-black uppercase text-emerald-600">
            Status
          </p>
          <p className="mt-1 text-sm font-black text-emerald-800">
            {status}
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Mila rechnet mit deinem aktuellen Status: <strong>{userStatus}</strong>.
        Das ist eine Orientierung, keine Steuerberatung.
      </p>
    </section>
  )
}