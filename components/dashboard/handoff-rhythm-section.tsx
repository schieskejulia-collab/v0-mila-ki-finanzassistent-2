'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { periodLabel, readHandoffCycle, type HandoffRhythm as Rhythm } from '@/lib/handoff-cycles'

const ACTIVE_CLIENT_KEY = 'mila-active-client-v1'
const TAKEOVER_KEY = 'mila-client-takeovers-v1'

type Takeover = {
  period?: string
  handoffRhythm?: Rhythm
}

function rhythmLabel(value?: Rhythm) {
  if (value === 'monthly') return 'Monatlich'
  if (value === 'quarterly') return 'Quartalsweise'
  if (value === 'halfyear') return 'Halbjährlich'
  if (value === 'yearly') return 'Jährlich'
  if (value === 'individual') return 'Individuell'
  return 'Laut Kanzlei'
}

function startPeriodLabel(period?: string) {
  if (!period) return 'noch nicht festgelegt'
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return period
  return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

export function HandoffRhythmSection() {
  const [takeover, setTakeover] = useState<Takeover | null>(null)
  const [hasActiveClient, setHasActiveClient] = useState(false)
  const [cyclePeriod, setCyclePeriod] = useState('')

  useEffect(() => {
    function load() {
      try {
        const activeClientId = window.localStorage.getItem(ACTIVE_CLIENT_KEY) || ''
        setHasActiveClient(Boolean(activeClientId))
        if (!activeClientId) return
        const raw = window.localStorage.getItem(TAKEOVER_KEY)
        const parsed = raw ? JSON.parse(raw) : {}
        const current = parsed?.[activeClientId] || null
        setTakeover(current)
        const cycle = readHandoffCycle(activeClientId)
        setCyclePeriod(cycle.activePeriod || current?.period || '')
      } catch {
        setTakeover(null)
      }
    }

    load()
    window.addEventListener('mila-handoff-cycle-updated', load)
    return () => window.removeEventListener('mila-handoff-cycle-updated', load)
  }, [])

  const rhythm = takeover?.handoffRhythm || 'kanzlei'
  const collectionPeriod = cyclePeriod ? periodLabel(cyclePeriod, rhythm) : 'Zeitraum laut Kanzleivorgabe'

  if (!hasActiveClient) return null

  return (
    <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">Übergaberhythmus</p>
          <h2 className="mt-1 text-xl font-black">Wann gesammelt übergeben wird</h2>
        </div>
        <span className="shrink-0 rounded-full bg-sky-50 px-3 py-2 text-xs font-black text-sky-700">{rhythmLabel(rhythm)}</span>
      </div>

      {!takeover ? (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4">
          <p className="text-sm font-black text-amber-800">Noch nicht festgelegt</p>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">Lege im Onboarding zuerst fest, welcher Rhythmus mit der Kanzlei oder dem Mandanten vereinbart ist.</p>
          <Link href="/mandanten" className="mt-3 inline-flex rounded-xl bg-white px-3 py-2 text-sm font-black text-violet-700 ring-1 ring-violet-100">Zum Onboarding →</Link>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Start ab</p>
              <p className="mt-1 text-sm font-black text-slate-900">{startPeriodLabel(takeover.period)}</p>
            </div>
            <div className="rounded-2xl bg-sky-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-sky-600">Aktueller Sammelzeitraum</p>
              <p className="mt-1 text-sm font-black text-slate-900">{collectionPeriod}</p>
            </div>
          </div>

          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-relaxed text-slate-600">
            Mila sammelt und prüft Unterlagen laufend. Der Übergaberhythmus bestimmt nur, wann der vorbereitete Zeitraum gebündelt an die Kanzlei weitergegeben wird. Nach einem abgeschlossenen Zeitraum startet Mila bei festen Rhythmen automatisch den nächsten Sammelzeitraum.
          </p>

          {rhythm === 'kanzlei' && (
            <p className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm font-semibold leading-relaxed text-amber-900">Kein automatischer Folgetermin: Mila wartet auf die Vorgabe der zuständigen Kanzlei.</p>
          )}

          <Link href="/mandanten" className="mt-4 flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-black text-violet-700 ring-1 ring-violet-100">Rhythmus ändern →</Link>
        </>
      )}
    </section>
  )
}
