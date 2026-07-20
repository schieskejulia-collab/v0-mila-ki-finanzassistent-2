import { daysUntil, formatEuro } from '@/lib/dashboard-helpers'

export function DailySummaryCard({ model }: { model: any }) {
  const next = model.nextObligation
  const days = next ? daysUntil(next.dueDate || next.due_date) : null

  const nextText = next
    ? days === 0
      ? `Heute wird „${next.title || 'eine Zahlung'}“ über ${formatEuro(next.amount)} fällig.`
      : days === 1
        ? `Morgen wird „${next.title || 'eine Zahlung'}“ über ${formatEuro(next.amount)} fällig.`
        : `In ${days} Tagen wird „${next.title || 'eine Zahlung'}“ über ${formatEuro(next.amount)} fällig.`
    : 'Aktuell ist keine fällige Verpflichtung eingetragen.'

  const actionText =
    model.buckets.overdue.length > 0
      ? 'Heute solltest du die älteste überfällige Zahlung prüfen.'
      : model.milaMood.label === 'Heute ruhig'
        ? 'Heute besteht kein akuter Handlungsbedarf.'
        : model.milaMood.message

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
          {model.milaMood.emoji} Mila fasst zusammen
        </p>

        <p className="mt-3 text-base font-bold leading-relaxed text-slate-800">
          Nach offenen Verpflichtungen und Rücklage sind voraussichtlich{' '}
          {formatEuro(model.availableAfterReserve)} frei verfügbar.
        </p>

        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
          {nextText} {actionText}
        </p>
      </div>
    </section>
  )
}