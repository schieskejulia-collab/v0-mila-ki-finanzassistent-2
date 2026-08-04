'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  fetchMilaContext,
  getCurrentMilaMonth,
  type MilaContext,
} from '@/lib/mila-context-client'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

function formatEuro(value: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value || 0)
}

export function MilaContextPanel() {
  const [state, setState] = useState<LoadState>('idle')
  const [context, setContext] = useState<MilaContext | null>(null)
  const [error, setError] = useState<string | null>(null)

  const month = useMemo(() => getCurrentMilaMonth(), [])

  async function loadContext() {
    setState('loading')
    setError(null)

    const result = await fetchMilaContext(month)

    if (!result.ok || !result.context) {
      setContext(null)
      setError(result.error || 'Mila Context konnte nicht geladen werden.')
      setState('error')
      return
    }

    setContext(result.context)
    setState('ready')
  }

  useEffect(() => {
    void loadContext()
  }, [])

  const openObligations = context?.openObligations?.length || 0
  const suggestions = context?.suggestions || []
  const warnings = context?.warnings || []

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-violet-100">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-500">
            Mila Context
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">
            Live-Kontext
          </h2>
          <p className="mt-2 text-base font-semibold text-slate-500">
            Verbindet Finanzen, Pflichten, Ziele und Dokumente.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadContext()}
          disabled={state === 'loading'}
          className="rounded-2xl bg-violet-100 px-4 py-3 text-sm font-black text-violet-700 disabled:opacity-60"
        >
          {state === 'loading' ? 'Lade...' : 'Neu laden'}
        </button>
      </div>

      {state === 'error' && (
        <div className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      {state === 'loading' && !context && (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
          Mila Context wird geladen...
        </div>
      )}

      {state === 'ready' && context && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-violet-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-500">
                Monat
              </p>
              <p className="mt-2 text-xl font-black text-slate-950">
                {context.month}
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">
                Score
              </p>
              <p className="mt-2 text-xl font-black text-emerald-700">
                {context.healthScore}/100
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-400">
                Einnahmen
              </p>
              <p className="mt-2 text-sm font-black text-emerald-700">
                {formatEuro(context.incomeTotal)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-400">
                Ausgaben
              </p>
              <p className="mt-2 text-sm font-black text-rose-600">
                {formatEuro(context.expenseTotal)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-400">
                Saldo
              </p>
              <p className="mt-2 text-sm font-black text-slate-950">
                {formatEuro(context.balance)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Offene Pflichten
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {openObligations}
            </p>
          </div>

          {suggestions.length > 0 && (
            <div className="rounded-2xl bg-violet-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-500">
                Vorschlaege
              </p>
              <ul className="mt-3 space-y-2 text-sm font-bold text-slate-700">
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <li key={`${suggestion}-${index}`}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-600">
                Warnungen
              </p>
              <ul className="mt-3 space-y-2 text-sm font-bold text-amber-800">
                {warnings.slice(0, 3).map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}