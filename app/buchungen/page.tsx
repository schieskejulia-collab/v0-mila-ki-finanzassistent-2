'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useFinance } from '@/lib/store'

type EntryType = 'income' | 'expense'
type ViewMode = 'all' | 'income' | 'expense'

const months = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]

function formatEuro(value: number | string) {
  const number =
    typeof value === 'number' ? value : Number(String(value).replace(',', '.'))

  return (Number.isFinite(number) ? number : 0).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function formatDate(value?: string) {
  if (!value) return 'Kein Datum'
  try {
    return new Date(value).toLocaleDateString('de-DE')
  } catch {
    return value
  }
}

function getDate(value?: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export default function BuchungenPage() {
  const { expenses, incomes, deleteExpense, deleteIncome, summary } =
    useFinance()

  const [openId, setOpenId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | number | null>(null)
  const [search, setSearch] = useState('')
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  )
  const [selectedMonth, setSelectedMonth] = useState('alle')
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const allEntries = useMemo(() => {
    return [
      ...incomes.map((income) => ({
        ...income,
        entryType: 'income' as EntryType,
        displayTitle: income.title || income.client || 'Einnahme',
        displaySub: income.client || 'Kein Kunde',
      })),
      ...expenses.map((expense) => ({
        ...expense,
        entryType: 'expense' as EntryType,
        displayTitle: expense.title || expense.vendor || 'Ausgabe',
        displaySub: expense.category || 'Sonstiges',
      })),
    ].sort((a, b) => {
      const da = getDate(a.date)?.getTime() || 0
      const db = getDate(b.date)?.getTime() || 0
      return db - da
    })
  }, [incomes, expenses])

  const years = useMemo(() => {
    const found = allEntries
      .map((entry) => getDate(entry.date)?.getFullYear().toString())
      .filter(Boolean) as string[]

    return Array.from(new Set([new Date().getFullYear().toString(), ...found]))
  }, [allEntries])

  const filteredEntries = useMemo(() => {
    const searchTerm = search.toLowerCase().trim()

    return allEntries.filter((entry) => {
      const date = getDate(entry.date)

      const text = `
        ${entry.title || ''}
        ${entry.vendor || ''}
        ${entry.client || ''}
        ${entry.category || ''}
        ${entry.note || ''}
      `.toLowerCase()

      const matchesSearch = !searchTerm || text.includes(searchTerm)
      const matchesYear =
        !date || date.getFullYear().toString() === selectedYear
      const matchesMonth =
        selectedMonth === 'alle' ||
        !date ||
        date.getMonth().toString() === selectedMonth
      const matchesType =
        viewMode === 'all' ||
        (viewMode === 'income' && entry.entryType === 'income') ||
        (viewMode === 'expense' && entry.entryType === 'expense')

      return matchesSearch && matchesYear && matchesMonth && matchesType
    })
  }, [allEntries, search, selectedYear, selectedMonth, viewMode])
const visibleEntries = filteredEntries.slice(0, 30)
  const groupedEntries = useMemo(() => {
    const groups: Record<string, typeof filteredEntries> = {}

    visibleEntries.forEach((entry) => {
      const date = getDate(entry.date)
      const key = date
        ? `${months[date.getMonth()]} ${date.getFullYear()}`
        : 'Ohne Datum'

      if (!groups[key]) groups[key] = []
      groups[key].push(entry)
    })

    return Object.entries(groups)
  }, [filteredEntries])

  async function handleDelete(entry: any) {
    const text =
      entry.entryType === 'income'
        ? 'Diese Einnahme wirklich löschen?'
        : 'Diese Ausgabe wirklich löschen?'

    if (!confirm(text)) return

    setDeletingId(entry.id)

    try {
      if (entry.entryType === 'income') {
        await deleteIncome(entry.id)
      } else {
        await deleteExpense(entry.id)
      }

      setOpenId(null)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="min-h-screen space-y-5 bg-[#fbf9ff] p-4 pb-40 text-slate-950">
      <section className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Buchungen</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Suche, filtere und prüfe deine Finanzen.
          </p>
        </div>

        <Link
          href="/neue-buchungen"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-2xl font-black text-white shadow-sm"
        >
          +
        </Link>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <div className="rounded-3xl bg-white p-3 shadow-sm">
          <p className="text-[9px] font-black uppercase text-slate-400">
            Einnahmen
          </p>
          <p className="mt-1 text-xs font-black text-emerald-700">
            {formatEuro(summary.totalIncomes)}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-3 shadow-sm">
          <p className="text-[9px] font-black uppercase text-slate-400">
            Ausgaben
          </p>
          <p className="mt-1 text-xs font-black text-rose-700">
            {formatEuro(summary.totalExpenses)}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-3 shadow-sm">
          <p className="text-[9px] font-black uppercase text-slate-400">
            Saldo
          </p>
          <p className="mt-1 text-xs font-black text-violet-700">
            {formatEuro(summary.balance)}
          </p>
        </div>
      </section>

      <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Suche nach Händler, Kunde, Kategorie..."
          className="w-full rounded-2xl bg-violet-50 p-4 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
        />

        <div className="grid grid-cols-2 gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full rounded-2xl bg-violet-50 p-4 text-sm font-bold text-slate-700 outline-none"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full rounded-2xl bg-violet-50 p-4 text-sm font-bold text-slate-700 outline-none"
          >
            <option value="alle">Alle Monate</option>
            {months.map((month, index) => (
              <option key={month} value={index.toString()}>
                {month}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            ['all', 'Alle'],
            ['income', 'Einnahmen'],
            ['expense', 'Ausgaben'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setViewMode(value as ViewMode)}
              className={
                viewMode === value
                  ? 'rounded-2xl bg-violet-600 px-3 py-3 text-xs font-black text-white'
                  : 'rounded-2xl bg-violet-50 px-3 py-3 text-xs font-black text-violet-700'
              }
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
          Gefundene Buchungen ({filteredEntries.length})
        </h2>

        {filteredEntries.length === 0 ? (
          <div className="rounded-3xl bg-white p-5 text-sm font-bold text-slate-500 shadow-sm">
            Keine passenden Buchungen gefunden.
          </div>
        ) : (
          groupedEntries.map(([groupName, entries]) => {
            const isGroupOpen = openGroups[groupName] ?? true

            return (
              <div key={groupName} className="rounded-[2rem] bg-white p-4 shadow-sm">
                <button
                  type="button"
                  onClick={() =>
                    setOpenGroups((prev) => ({
                      ...prev,
                      [groupName]: !isGroupOpen,
                    }))
                  }
                  className="flex w-full items-center justify-between"
                >
                  <div>
                    <p className="text-lg font-black text-slate-900">
                      {groupName}
                    </p>
                    <p className="text-xs font-bold text-slate-400">
                      {entries.length} Buchungen
                    </p>
                  </div>

                  <span className="text-xl font-black text-violet-700">
                    {isGroupOpen ? '⌃' : '⌄'}
                  </span>
                </button>

                {isGroupOpen && (
                  <div className="mt-4 space-y-3">
                    {entries.map((entry) => {
                      const id = `${entry.entryType}-${entry.id}`
                      const isOpen = openId === id
                      const isDeleting = deletingId === entry.id
                      const isIncome = entry.entryType === 'income'

                      return (
                        <div
                          key={id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setOpenId(isOpen ? null : id)}
                          className="rounded-3xl bg-slate-50 p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-black">
                                {isIncome ? '💰 ' : '📉 '}
                                {entry.displayTitle}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                {entry.displaySub} · {formatDate(entry.date)}
                              </p>
                            </div>

                            <p
                              className={
                                isIncome
                                  ? 'font-black text-emerald-700'
                                  : 'font-black text-rose-700'
                              }
                            >
                              {isIncome ? '+' : '-'}
                              {formatEuro(entry.amount)}
                            </p>
                          </div>

                          {isOpen && (
                            <div className="mt-4 border-t border-slate-200 pt-3 text-sm text-slate-600">
                              {isIncome ? (
                                <>
                                  <p>Kunde: {entry.client || 'Nicht angegeben'}</p>
                                  <p>Datum: {formatDate(entry.date)}</p>
                                </>
                              ) : (
                                <>
                                  <p>Händler: {entry.vendor || 'Nicht angegeben'}</p>
                                  <p>Kategorie: {entry.category || 'Sonstiges'}</p>
                                  <p>Datum: {formatDate(entry.date)}</p>
                                </>
                              )}

                              {entry.note && <p>Notiz: {entry.note}</p>}

                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(entry)
                                }}
                                className="mt-3 rounded-2xl bg-rose-50 px-4 py-2 text-sm font-black text-rose-600 disabled:opacity-50"
                              >
                                {isDeleting ? 'Lösche...' : 'Löschen'}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </section>
    </main>
  )
}