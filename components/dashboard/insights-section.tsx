import Link from 'next/link'

export function InsightsSection({ model }: { model: any }) {
  return (
    <>
      <section className="space-y-2">
        <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
          Mila-Ampel
        </h2>

        <div
          className={`flex items-center gap-2.5 rounded-xl border p-4 text-xs font-bold shadow-sm ${model.trafficLight.color}`}
        >
          <span
            className={`h-2.5 w-2.5 animate-pulse rounded-full ${model.trafficLight.dot}`}
          />

          {model.trafficLight.status}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          📊 KI-Erkenntnisse
        </h2>

        {model.financeAnalysis.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold leading-relaxed text-slate-600">
              Mila sammelt noch Daten. Mit weiteren Buchungen werden Muster und
              dein finanzieller Spielraum genauer.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {model.financeAnalysis.map((item: any) => (
              <Insight key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <Link
        href="/chat"
        className="block rounded-xl bg-purple-600 py-4 text-center text-white shadow-md shadow-purple-100 active:scale-95"
      >
        <span className="block text-sm font-bold">
          💬 Mit Mila sprechen
        </span>

        <span className="mt-1 block text-[10px] font-semibold text-white/75">
          Dein persönlicher Finanzanker
        </span>
      </Link>

      <p className="pt-2 text-center text-[10px] leading-relaxed text-slate-400">
        Mila gibt dir Orientierung für bessere Entscheidungen. Keine
        Steuerberatung.
      </p>
    </>
  )
}

function Insight({ item }: { item: any }) {
  const style =
    item.type === 'danger'
      ? 'border-rose-100 bg-rose-50 text-rose-800'
      : item.type === 'warning'
        ? 'border-amber-100 bg-amber-50 text-amber-800'
        : item.type === 'good'
          ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
          : 'border-violet-100 bg-violet-50 text-violet-800'

  return (
    <div className={`rounded-2xl border p-4 ${style}`}>
      <p className="font-black">
        {item.title}
      </p>

      <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-700">
        {item.message}
      </p>
    </div>
  )
}