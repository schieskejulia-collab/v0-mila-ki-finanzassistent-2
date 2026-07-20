import { formatEuro } from '@/lib/dashboard-helpers'

export function OverviewSection({ model }: { model: any }) {
  return (
    <section className="space-y-4 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
      {model.goals.length > 0 && <GoalCard goal={model.goals[0]} />}

      <div className="rounded-[2rem] bg-purple-600 p-5 text-white shadow-md shadow-purple-100">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
          Aktueller Überschuss
        </p>

        <p className="mt-1 text-3xl font-black">
          {formatEuro(model.summary.balance)}
        </p>

        <p className="mt-2 text-xs font-bold text-white/80">
          Einnahmen {formatEuro(model.summary.totalIncomes)} · Ausgaben{' '}
          {formatEuro(model.summary.totalExpenses)}
        </p>

        {model.openObligations.length > 0 && (
          <div className="mt-4 rounded-2xl bg-white/10 p-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-white/70">
              Offene Verpflichtungen
            </p>

            <p className="mt-1 text-lg font-black">
              {formatEuro(model.openObligationAmount)}
            </p>

            <p className="mt-1 text-xs font-bold text-white/80">
              Danach verfügbar: {formatEuro(model.availableAfterObligations)}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          title="Finanzgesundheit"
          value={`${model.financeScore}/100`}
          note={
            model.financeScore >= 80
              ? '🟢 Stabil'
              : model.financeScore >= 50
                ? '🟡 Beobachten'
                : '🔴 Achtung'
          }
          className="border-emerald-100 bg-emerald-50 text-emerald-800"
        />

        <MetricCard
          title="Rücklage"
          value={formatEuro(model.taxReserve)}
          note="Empfohlene Steuer-Rücklage"
          className="border-amber-100 bg-amber-50 text-amber-800"
        />
      </div>
    </section>
  )
}

function GoalCard({ goal }: { goal: any }) {
  const percent = Math.min(
    100,
    Math.round((goal.saved / goal.target) * 100),
  )

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wider text-purple-600">
        🎯 Aktuelles Sparziel
      </p>

      <h3 className="mt-3 text-xl font-black">
        {goal.title}
      </h3>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-3 text-sm font-bold">
        {formatEuro(goal.saved)} von {formatEuro(goal.target)}
      </p>

      <p className="text-xs text-slate-500">
        Noch {formatEuro(goal.target - goal.saved)}
      </p>
    </div>
  )
}

function MetricCard(props: {
  title: string
  value: string
  note: string
  className: string
}) {
  return (
    <div className={`rounded-2xl border p-4 ${props.className}`}>
      <p className="text-[10px] font-black uppercase tracking-wider">
        {props.title}
      </p>

      <p className="mt-1 text-2xl font-black">
        {props.value}
      </p>

      <p className="mt-1 text-xs font-bold text-slate-600">
        {props.note}
      </p>
    </div>
  )
}