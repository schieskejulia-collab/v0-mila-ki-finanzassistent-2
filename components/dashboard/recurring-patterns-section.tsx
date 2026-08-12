'use client'

import { useMemo } from 'react'
import { useFinance } from '@/lib/store'

type ExpenseLike = {
  id?: string
  amount?: number | string
  date?: string
  vendor?: string
  title?: string
  category?: string
  recurring?: boolean
}

type Pattern = {
  key: string
  label: string
  months: string[]
  count: number
  average: number
  latestAmount: number
  deviationPercent: number
  recurringMarked: boolean
}

function monthKey(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 7)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function normalizeLabel(item: ExpenseLike) {
  return String(item.vendor || item.title || item.category || 'Unbekannter Vorgang')
    .trim()
    .toLocaleLowerCase('de-DE')
    .replace(/\s+/g, ' ')
}

function displayLabel(item: ExpenseLike) {
  return String(item.vendor || item.title || item.category || 'Wiederkehrender Vorgang').trim()
}

function euro(value: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
}

export function RecurringPatternsSection() {
  const finance = useFinance()

  const patterns = useMemo<Pattern[]>(() => {
    const groups = new Map<string, ExpenseLike[]>()

    for (const item of (finance.expenses || []) as ExpenseLike[]) {
      const key = normalizeLabel(item)
      if (!key) continue
      const group = groups.get(key) || []
      group.push(item)
      groups.set(key, group)
    }

    return Array.from(groups.entries())
      .map(([key, items]) => {
        const sorted = [...items].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
        const months = Array.from(new Set(sorted.map((item) => monthKey(item.date)).filter(Boolean)))
        const amounts = sorted.map((item) => Number(item.amount || 0)).filter((amount) => Number.isFinite(amount) && amount >= 0)
        const recurringMarked = sorted.some((item) => item.recurring === true)
        if (months.length < 2 && !recurringMarked) return null

        const latestAmount = amounts.at(-1) || 0
        const previous = amounts.slice(0, -1)
        const average = previous.length > 0 ? previous.reduce((sum, amount) => sum + amount, 0) / previous.length : latestAmount
        const deviationPercent = average > 0 ? ((latestAmount - average) / average) * 100 : 0

        return {
          key,
          label: displayLabel(sorted.at(-1) || {}),
          months,
          count: sorted.length,
          average,
          latestAmount,
          deviationPercent,
          recurringMarked,
        }
      })
      .filter((item): item is Pattern => Boolean(item))
      .sort((a, b) => b.months.length - a.months.length || b.count - a.count)
      .slice(0, 6)
  }, [finance.expenses])

  return (
    <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Mandantenhistorie</p>
          <h2 className="mt-1 text-xl font-black">Wiederkehrende Vorgänge</h2>
        </div>
        <span className="shrink-0 rounded-full bg-violet-50 px-3 py-2 text-xs font-black text-violet-700">{patterns.length} Muster</span>
      </div>

      <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
        Mila vergleicht gleiche Anbieter oder Vorgänge über mehrere Monate. Das ist nur ein organisatorischer Hinweis – keine steuerliche Bewertung und keine Empfehlung zum Einsparen.
      </p>

      {patterns.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-700">Noch kein belastbares Muster</p>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">Sobald derselbe Vorgang in mindestens zwei Monaten vorkommt oder als wiederkehrend markiert ist, erscheint er hier.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {patterns.map((pattern) => {
            const noticeable = Math.abs(pattern.deviationPercent) >= 15 && pattern.count >= 2
            return (
              <article key={pattern.key} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-slate-900">{pattern.label}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{pattern.count}× erfasst · {pattern.months.length} Monat{pattern.months.length === 1 ? '' : 'e'}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">Muster erkannt</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white p-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Bisheriger Ø</p><p className="mt-1 text-sm font-black">{euro(pattern.average)}</p></div>
                  <div className="rounded-xl bg-white p-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Zuletzt</p><p className="mt-1 text-sm font-black">{euro(pattern.latestAmount)}</p></div>
                </div>

                {noticeable && (
                  <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold leading-relaxed text-slate-700">
                    Auffällige Abweichung zum bisherigen Muster ({pattern.deviationPercent > 0 ? '+' : ''}{Math.round(pattern.deviationPercent)} %). Bitte organisatorisch prüfen.
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <p className="mt-4 text-[11px] font-semibold leading-relaxed text-slate-400">Mila kennzeichnet nur erkennbare Wiederholungen und Abweichungen. Ob ein Vorgang steuerlich relevant, notwendig oder veränderbar ist, wird hier nicht entschieden.</p>
    </section>
  )
}
