import Link from 'next/link'
import { formatEuro } from '@/lib/dashboard-helpers'

export function InsightsSection({ model }: { model: any }) {
  return (
    <>
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          📊 Mila erkennt
        </h2>

        <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-5">
          <p className="text-sm font-black text-violet-700">
            💰 Frei verfügbar
          </p>

          <p className="mt-2 text-3xl font-black text-slate-950">
            {formatEuro(model.availableAfterReserve)}
          </p>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-700">
            Alle offenen Verpflichtungen und die empfohlene Steuer-Rücklage
            wurden bereits berücksichtigt.
          </p>
        </div>
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