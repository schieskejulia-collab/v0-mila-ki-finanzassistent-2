import { daysUntil, formatEuro } from '@/lib/dashboard-helpers'

export function DailySummaryCard({ model }: { model: any }) {
  const next = model.nextObligation
  const days = next ? daysUntil(next.dueDate || next.due_date) : null

  let nextText = 'Aktuell steht keine Verpflichtung an.'

  if (next) {
    if (days === 0) {
      nextText = `Heute wird ${formatEuro(next.amount)} fällig.`
    } else if (days === 1) {
      nextText = `Morgen werden ${formatEuro(next.amount)} fällig.`
    } else {
      nextText = `In ${days} Tagen werden ${formatEuro(next.amount)} fällig.`
    }
  }

  return (
    <section className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-600">
        Heute für dich
      </p>

      <h1 className="mt-4 text-4xl font-black leading-tight text-slate-950">
        {model.greeting},<br />
        {model.userName} 🌸
      </h1>

      <div className="mt-6 rounded-3xl bg-violet-50 p-5">
        <p className="text-sm font-black text-violet-700">
          💜 Mila fasst zusammen
        </p>

        <p className="mt-4 text-base leading-relaxed font-semibold text-slate-700">
          Nach allen offenen Verpflichtungen und deiner empfohlenen Rücklage
          kannst du aktuell
        </p>

        <p className="mt-4 text-4xl font-black text-slate-950">
          {formatEuro(model.availableAfterReserve)}
        </p>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          {nextText}
        </p>

        <div className="mt-5 rounded-2xl bg-white p-4">
          <p className="text-sm font-semibold text-slate-700">
            {model.milaMood.label === 'Heute ruhig'
              ? '🌸 Heute besteht kein akuter Handlungsbedarf.'
              : model.milaMood.message}
          </p>
        </div>
      </div>
    </section>
  )
}