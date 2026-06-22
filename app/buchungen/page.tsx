'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useFinance } from '@/lib/store'

type EntryType = 'income' | 'expense'
// ✅ Erweitertes ViewMode für Status-Filter
type ViewMode = 'all' | 'income' | 'expense' | 'offen' | 'bezahlt' | 'ueberfaellig'

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

// ✅ Funktion für exakte Fälligkeitshinweise
function getDueText(status?: string, dueDate?: string) {
  if (!dueDate || status === 'bezahlt') return ''

  const today = new Date()
  const due = new Date(dueDate)
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)

  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return `🔴 Seit ${Math.abs(diffDays)} Tag${Math.abs(diffDays) === 1 ? '' : 'en'} überfällig`
  }
  if (diffDays === 0) {
    return '🟠 Heute fällig'
  }
  return `原始 Fällig in ${diffDays} Tag${diffDays === 1 ? '' : 'en'}`
}

// ✅ Funktion für dynamische Status-Badges & rote Markierung
function getStatusInfo(status?: string, dueDate?: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = dueDate ? new Date(dueDate) : null
  if (due) due.setHours(0, 0, 0, 0)

  if (status === 'bezahlt') {
    return {
      label: '🟢 Bezahlt',
      className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      isOverdue: false
    }
  }

  if (status === 'ueberfaellig' || (due && due < today)) {
    return {
      label: '🔴 Überfällig',
      className: 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse-slow',
      isOverdue: true
    }
  }

  if (dueDate) {
    return {
      label: '🟡 Offen',
      className: 'bg-amber-50 text-amber-700 border border-amber-200',
      isOverdue: false
    }
  }

  return {
    label: '🟡 Offen',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
    isOverdue: false
  }
}

export default function BuchungenPage() {
  const { expenses, incomes, deleteExpense, deleteIncome, summary } = useFinance()

  const [openId, setOpenId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | number | null>(null)
  const [search, setSearch] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
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

  // ✅ Gefilterte Einträge inkl. Status-Filter-Logik
  const filteredEntries = useMemo(() => {
    const searchTerm = search.toLowerCase().trim()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return allEntries.filter((entry) => {
      const date = getDate(entry.date)
      const due = (entry.due_date || entry.dueDate) ? new Date(entry.due_date || entry.dueDate) : null
      if (due) due.setHours(0, 0, 0, 0)

      const text = `${entry.title || ''} ${entry.vendor || ''} ${entry.client || ''} ${entry.category || ''} ${entry.note || ''}`.toLowerCase()

      const matchesSearch = !searchTerm || text.includes(searchTerm)
      const matchesYear = !date || date.getFullYear().toString() === selectedYear
      const matchesMonth = selectedMonth === 'alle' || !date || date.getMonth().toString() === selectedMonth
      
      // ✅ Filter für Typ & Status verarbeiten
      let matchesTypeOrStatus = true
      if (viewMode === 'income') matchesTypeOrStatus = entry.entryType === 'income'
      if (viewMode === 'expense') matchesTypeOrStatus = entry.entryType === 'expense'
      if (viewMode === 'offen') matchesTypeOrStatus = entry.entryType === 'income' && entry.status !== 'bezahlt'
      if (viewMode === 'bezahlt') matchesTypeOrStatus = entry.status === 'bezahlt'
      if (viewMode === 'ueberfaellig') {
        matchesTypeOrStatus = entry.entryType === 'income' && (entry.status === 'ueberfaellig' || (due !== null && due < today && entry.status !== 'bezahlt'))
      }

      return matchesSearch && matchesYear && matchesMonth && matchesTypeOrStatus
    })
  }, [allEntries, search, selectedYear, selectedMonth, viewMode])

  const groupedEntries = useMemo(() => {
    const groups: Record<string, typeof filteredEntries> = {}
    filteredEntries.forEach((entry) => {
      const date = getDate(entry.date)
      const key = date ? `${months[date.getMonth()]} ${date.getFullYear()}` : 'Ohne Datum'
      if (!groups[key]) groups[key] = []
      groups[key].push(entry)
    })
    return Object.entries(groups)
  }, [filteredEntries])

  async function handleDelete(entry: any) {
    const text = entry.entryType === 'income' ? 'Diese Einnahme wirklich löschen?' : 'Diese Ausgabe wirklich löschen?'
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

  // ✅ Funktion für den Erinnerungsbutton
  const triggerReminder = (entry: any) => {
    const text = `Erinnerung für ${entry.displayTitle} (${formatEuro(entry.amount)}):\nFällig am: ${formatDate(entry.due_date || entry.dueDate)}`
    if (navigator.share) {
      navigator.share({ title: 'Zahlungserinnerung', text }).catch(console.error)
    } else {
      navigator.clipboard.writeText(text)
      alert('Zahlungserinnerung in Zwischenablage kopiert!')
    }
  }

  return (
    <main className="min-h-screen space-y-5 bg-[#fbf9ff] p-4 pb-40 text-slate-950">
      <section className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Buchungen</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">Suche, filtere und prüfe deine Finanzen.</p>
        </div>
        <Link href="/neue-buchungen" className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-2xl font-black text-white shadow-sm">+</Link>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <div className="rounded-3xl bg-white p-3 shadow-sm">
          <p className="text-[9px] font-black uppercase text-slate-400">Einnahmen</p>
          <p className="mt-1 text-xs font-black text-emerald-700">{formatEuro(summary.totalIncomes)}</p>
        </div>
        <div className="rounded-3xl bg-white p-3 shadow-sm">
          <p className="text-[9px] font-black uppercase text-slate-400">Ausgaben</p>
          <p className="mt-1 text-xs font-black text-rose-700">{formatEuro(summary.totalExpenses)}</p>
        </div>
        <div className="rounded-3xl bg-white p-3 shadow-sm">
          <p className="text-[9px] font-black uppercase text-slate-400">Saldo</p>
          <p className="mt-1 text-xs font-black text-violet-700">{formatEuro(summary.balance)}</p>
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
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full rounded-2xl bg-violet-50 p-4 text-sm font-bold text-slate-700 outline-none">
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full rounded-2xl bg-violet-50 p-4 text-sm font-bold text-slate-700 outline-none">
            <option value="alle">Alle Monate</option>
            {months.map((month, index) => <option key={month} value={index.toString()}>{month}</option>)}
          </select>
        </div>

        {/* ✅ NEUE FILTERZEILE: Schnellauswahl Typen & Status */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {[
            ['all', 'Alle'],
            ['income', 'Einnahmen'],
            ['expense', 'Ausgaben'],
            ['offen', '⏳ Offen'],
            ['bezahlt', '✅ Bezahlt'],
            ['ueberfaellig', '🚨 Überfällig'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setViewMode(value as ViewMode)}
              className={`rounded-xl px-3 py-2 text-xs font-black transition-all ${
                viewMode === value
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
              }`}
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
          <div className="rounded-3xl bg-white p-5 text-sm font-bold text-slate-500 shadow-sm">Keine passenden Buchungen gefunden.</div>
        ) : (
          groupedEntries.map(([groupName, entries]) => {
            const isGroupOpen = openGroups[groupName] ?? true

            return (
              <div key={groupName} className="rounded-[2rem] bg-white p-4 shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenGroups((prev) => ({ ...prev, [groupName]: !isGroupOpen }))}
                  className="flex w-full items-center justify-between"
                >
                  <div>
                    <p className="text-lg font-black text-slate-900">{groupName}</p>
                    <p className="text-xs font-bold text-slate-400">{entries.length} Buchungen</p>
                  </div>
                  <span className="text-xl font-black text-violet-700">{isGroupOpen ? '⌃' : '⌄'}</span>
                </button>

                {isGroupOpen && (
                  <div className="mt-4 space-y-3">
                    {entries.map((entry) => {
                      const id = `${entry.entryType}-${entry.id}`
                      const isOpen = openId === id
                      const isDeleting = deletingId === entry.id
                      const isIncome = entry.entryType === 'income'
                      
                      // ✅ Status berechnen
                      const status = getStatusInfo(entry.status, entry.due_date || entry.dueDate)
                      const dueText = getDueText(entry.status, entry.due_date || entry.dueDate)

                      return (
                        <div
                          key={id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setOpenId(isOpen ? null : id)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpenId(isOpen ? null : id) }}
                          // ✅ ÜBERFÄLLIGE BUCHUNGEN ROT MARKIEREN (Rand + sanfter roter BG)
                          className={`w-full text-left rounded-3xl p-4 transition-all outline-none cursor-pointer ${
                            status.isOverdue 
                              ? 'bg-rose-50/60 border border-rose-200 hover:bg-rose-50' 
                              : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-black text-slate-900">
                                  {isIncome ? '💰 ' : '📉 '}
                                  {entry.displayTitle}
                                </p>
                                {/* ✅ STATUS-BADGE direkt sichtbar */}
                                {isIncome && (
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${status.className}`}>
                                    {status.label}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                {entry.displaySub} · {formatDate(entry.date)}
                              </p>
                              {/* ✅ FÄLLIGKEITSHINWEISE unter dem Titel */}
                              {isIncome && dueText && (
                                <p className="mt-1 text-xs font-bold text-rose-600">{dueText}</p>
                              )}
                            </div>

                            <p className={`font-black text-base whitespace-nowrap ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {isIncome ? '+' : '-'}{formatEuro(entry.amount)}
                            </p>
                          </div>

                          {isOpen && (
                            <div className="mt-4 border-t border-slate-200/80 pt-3 text-sm text-slate-600" onClick={(e) => e.stopPropagation()}>
                              {isIncome ? (
                                <div className="space-y-1">
                                  <p><span className="font-bold text-slate-700">Kunde:</span> {entry.client || 'Nicht angegeben'}</p>
                                  {entry.due_date && <p><span className="font-bold text-slate-700">Fällig am:</span> {formatDate(entry.due_date)}</p>}
                                  <p><span className="font-bold text-slate-700">Buchungsdatum:</span> {formatDate(entry.date)}</p>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <p><span className="font-bold text-slate-700">Händler:</span> {entry.vendor || 'Nicht angegeben'}</p>
                                  <p><span className="font-bold text-slate-700">Kategorie:</span> {entry.category || 'Sonstiges'}</p>
                                  <p><span className="font-bold text-slate-700">Datum:</span> {formatDate(entry.date)}</p>
                                </div>
                              )}

                              {entry.note && <p className="mt-1 bg-white/60 p-2 rounded-xl border border-slate-100 text-xs italic">Notiz: {entry.note}</p>}

                              <div className="mt-4 flex items-center gap-2">
                                {/* ✅ ERINNERUNGSBUTTON (Nur für offene Einnahmen) */}
                                {isIncome && entry.status !== 'bezahlt' && (
                                  <button
                                    type="button"
                                    onClick={() => triggerReminder(entry)}
                                    className="rounded-2xl bg-amber-500 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-amber-600 shadow-sm"
                                  >
                                    🔔 Erinnern
                                  </button>
                                )}

                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() => handleDelete(entry)}
                                  className="rounded-2xl bg-rose-50 px-4 py-2 text-xs font-black text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-50"
                                >
                                  {isDeleting ? 'Lösche...' : 'Löschen'}
                                </button>
                              </div>
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
