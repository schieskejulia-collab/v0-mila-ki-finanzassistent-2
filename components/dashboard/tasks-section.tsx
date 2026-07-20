import Link from 'next/link'
import { formatEuro } from '@/lib/dashboard-helpers'

export function TasksSection({ model }: { model: any }) {
  return (
    <>
      {model.todayTask && <TodayTask task={model.todayTask} />}

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          💜 Heute wichtig
        </h2>

        <div className="mt-4 space-y-3 text-xs leading-relaxed">
          {model.assistantFindings.slice(0, 1).map((item: any) => (
            <Finding key={item.id} item={item} />
          ))}

          {model.overdueCount > 0 && (
            <Notice
              className="border-rose-100 bg-rose-50"
              title="🚨 Überfällige Zahlung"
              text={`${model.overdueCount} Einnahme(n) sind überfällig. Bitte zuerst Status oder Erinnerung prüfen.`}
            />
          )}

          {model.openCount > 0 && (
            <Notice
              className="border-amber-100 bg-amber-50"
              title="📥 Ausstehende Zahlungseingänge"
              text={`Du wartest auf ${model.openCount} Zahlungseingang/-eingänge über ${formatEuro(model.totalOpenAmount)}.`}
            />
          )}

          {model.recurringExpenses.length >= 2 && (
            <Notice
              className="border-blue-100 bg-blue-50"
              title={
                model.recurringExpenses.length >= 3
                  ? '🔁 Wiederkehrende Ausgaben'
                  : '💡 Möglicherweise wiederkehrend'
              }
              text={
                model.recurringExpenses.length >= 3
                  ? `Mila erkennt ${model.recurringExpenses.length} regelmäßige Kosten.`
                  : 'Diese Ausgabe wurde mehrfach erkannt. Mila beobachtet sie weiter.'
              }
            />
          )}

          {model.softwareExpenses.length > 0 && (
            <Notice
              className="border-violet-100 bg-violet-50"
              title="💻 Software & Tools"
              text={`${model.softwareExpenses.length} Tool-Kosten erkannt. Regelmäßiges Aufräumen lohnt sich.`}
            />
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          🧾 Offene Aufgaben
        </h2>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Counter
            value={model.buckets.overdue.length}
            label="Überfällig"
            className="bg-rose-50 text-rose-700"
          />

          <Counter
            value={model.buckets.dueSoon.length}
            label="Bald fällig"
            className="bg-amber-50 text-amber-700"
          />

          <Counter
            value={model.buckets.inkasso.length}
            label="Forderungen"
            className="bg-violet-50 text-violet-700"
          />
        </div>

        {model.obligations.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-600">
            📝 Noch keine Verpflichtungen angelegt.
          </p>
        ) : model.openObligations.length === 0 ? (
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
      </section>
    </>
  )
}

function TodayTask({ task }: { task: any }) {
  const tone =
    task.tone === 'danger'
      ? 'bg-rose-600'
      : task.tone === 'warning'
        ? 'bg-amber-500'
        : task.tone === 'good'
          ? 'bg-emerald-600'
          : 'bg-violet-600'

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">
            ✅ Heute erledigen
          </p>

          <p className="mt-2 text-xl font-black">
            {task.title}
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500">
          ca. 2 Min.
        </span>
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-600">
        {task.message}
      </p>

      <Link
        href={task.href}
        className={`mt-4 block rounded-2xl py-3 text-center text-sm font-black text-white ${tone}`}
      >
        Jetzt ansehen →
      </Link>
    </section>
  )
}

function Finding({ item }: { item: any }) {
  const style =
    item.priority === 'high'
      ? 'bg-rose-50 border-rose-100'
      : item.priority === 'medium'
        ? 'bg-amber-50 border-amber-100'
        : 'bg-violet-50 border-violet-100'

  return (
    <div className={`rounded-2xl border p-3 ${style}`}>
      <p className="font-black text-slate-800">
        {item.title}
      </p>

      <p className="mt-1 font-semibold text-slate-700">
        {item.message}
      </p>
    </div>
  )
}

function Notice({ className, title, text }: any) {
  return (
    <div className={`rounded-2xl border p-3 ${className}`}>
      <p className="font-black text-slate-800">
        {title}
      </p>

      <p className="mt-1 font-semibold text-slate-700">
        {text}
      </p>
    </div>
  )
}

function Counter({ value, label, className }: any) {
  return (
    <div className={`rounded-2xl p-3 ${className}`}>
      <p className="text-xl font-black">
        {value}
      </p>

      <p className="mt-1 text-[10px] font-bold">
        {label}
      </p>
    </div>
  )
}