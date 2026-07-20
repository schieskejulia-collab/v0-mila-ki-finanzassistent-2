import Link from 'next/link'

export function TasksSection({ model }: { model: any }) {
  return (
    <>
      {model.todayTask && <TodayTask task={model.todayTask} />}

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          💜 Heute wichtig
        </h2>

        <div className="mt-4">
          {model.assistantFindings.slice(0, 1).map((item: any) => (
            <Finding key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          🧾 Verpflichtungen
        </h2>

        {model.obligations.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
            📝 Noch keine Verpflichtungen angelegt.
          </p>
        ) : model.openObligations.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            🟢 Alle Verpflichtungen sind erledigt.
          </p>
        ) : (
          <Link
            href="/verpflichtungen"
            className="mt-4 block rounded-2xl bg-purple-600 py-3 text-center text-sm font-black text-white"
          >
            Verpflichtungen öffnen →
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

      <p className="mt-3 text-sm leading-relaxed text-slate-600">
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
      ? 'border-rose-100 bg-rose-50'
      : item.priority === 'medium'
        ? 'border-amber-100 bg-amber-50'
        : 'border-violet-100 bg-violet-50'

  return (
    <div className={`rounded-2xl border p-4 ${style}`}>
      <p className="text-sm font-black text-slate-900">
        {item.title}
      </p>

      <p className="mt-2 text-sm leading-relaxed text-slate-700">
        {item.message}
      </p>
    </div>
  )
}