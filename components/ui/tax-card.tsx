'use client'

import { useFinance } from '@/lib/store'

function formatEuro(value: number) {
  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function getTaxRate(status: string) {
  if (status === 'angestellt') return 0.1
  if (status === 'kleinunternehmer') return 0.25
  return 0.3
}

export function TaxCard() {
  const { summary, userStatus } = useFinance()

  const profit = summary.balance
  const taxRate = getTaxRate(userStatus)
  const taxReserve = profit > 0 ? profit * taxRate : 0
  const availableAfterReserve = profit > 0 ? profit - taxReserve : 0

  const status =
    profit <= 0
      ? 'Keine Rücklage nötig'
      : taxReserve < 100
      ? 'Kleine Rücklage reicht'
      : 'Rücklage einplanen'

  const statusColor =
    profit <= 0
      ? 'bg-slate-50 text-slate-700'
      : taxReserve < 100
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-amber-50 text-amber-700'

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
        Steuer-Cockpit
      </p>

      <div className="mt-4 rounded-[2rem] bg-amber-50 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">
          Empfohlene Rücklage
        </p>

        <h2 className="mt-2 text-3xl font-black text-slate-950">
          {formatEuro(taxReserve)}
        </h2>

        <p className="mt-2 text-sm font-semibold text-slate-600">
          Berechnet mit ca. {Math.round(taxRate * 100)}% auf deinen aktuellen
          Überschuss.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-violet-50 p-4">
          <p className="text-[10px] font-black uppercase text-violet-600">
            Überschuss
          </p>
          <p className="mt-1 text-sm font-black text-violet-800">
            {formatEuro(profit)}
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 p-4">
          <p className="text-[10px] font-black uppercase text-emerald-600">
            Frei danach
          </p>
          <p className="mt-1 text-sm font-black text-emerald-800">
            {formatEuro(availableAfterReserve)}
          </p>
        </div>
      </div>

      <div className={`mt-4 rounded-2xl p-4 text-sm font-black ${statusColor}`}>
        {status}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Mila rechnet mit deinem aktuellen Status: <strong>{userStatus}</strong>.
        Das ist eine Orientierung und ersetzt keine Steuerberatung.
      </p>
    </section>
  )
}