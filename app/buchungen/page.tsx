'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useFinance } from '@/lib/store'

function formatEuro(value: number | string) {
  const number =
    typeof value === 'number'
      ? value
      : Number(String(value).replace(',', '.'))

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

export default function BuchungenPage() {
  const { expenses, incomes, deleteExpense, deleteIncome, summary } =
    useFinance()

  const [openId, setOpenId] = useState<string | number | null>(null)
  const [deletingId, setDeletingId] = useState<string | number | null>(null)
const [search, setSearch] = useState('')
const [selectedYear, setSelectedYear] = useState(
  new Date().getFullYear().toString()
)
const [selectedMonth, setSelectedMonth] = useState('alle')
  async function handleDeleteIncome(id: string | number) {
    if (!confirm('Diese Einnahme wirklich löschen?')) return

    setDeletingId(id)

    try {
      await deleteIncome(id)
      setOpenId(null)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDeleteExpense(id: string | number) {
    if (!confirm('Diese Ausgabe wirklich löschen?')) return

    setDeletingId(id)

    try {
      await deleteExpense(id)
      setOpenId(null)
    } finally {
      setDeletingId(null)
    }
  }
const searchTerm = search.toLowerCase().trim()

const filteredIncomes = incomes.filter((income) => {
  const text = `${income.title || ''} ${income.client || ''} ${income.note || ''}`.toLowerCase()
  const date = income.date ? new Date(income.date) : null

  const matchesSearch = !searchTerm || text.includes(searchTerm)
  const matchesYear =
    !date || date.getFullYear().toString() === selectedYear
  const matchesMonth =
    selectedMonth === 'alle' || !date || date.getMonth().toString() === selectedMonth

  return matchesSearch && matchesYear && matchesMonth
})

const filteredExpenses = expenses.filter((expense) => {
  const text = `${expense.title || ''} ${expense.vendor || ''} ${expense.category || ''} ${expense.note || ''}`.toLowerCase()
  const date = expense.date ? new Date(expense.date) : null

  const matchesSearch = !searchTerm || text.includes(searchTerm)
  const matchesYear =
    !date || date.getFullYear().toString() === selectedYear
  const matchesMonth =
    selectedMonth === 'alle' || !date || date.getMonth().toString() === selectedMonth

  return matchesSearch && matchesYear && matchesMonth
})
  return (
    <main className="min-h-screen space-y-5 bg-[#fbf9ff] p-4 pb-40 text-slate-950">
      <section className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Übersicht</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Einnahmen, Ausgaben und Saldo.
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
      <option value={new Date().getFullYear().toString()}>
        {new Date().getFullYear()}
      </option>
    </select>

    <select
      value={selectedMonth}
      onChange={(e) => setSelectedMonth(e.target.value)}
      className="w-full rounded-2xl bg-violet-50 p-4 text-sm font-bold text-slate-700 outline-none"
    >
      <option value="alle">Alle Monate</option>
      <option value="0">Januar</option>
      <option value="1">Februar</option>
      <option value="2">März</option>
      <option value="3">April</option>
      <option value="4">Mai</option>
      <option value="5">Juni</option>
      <option value="6">Juli</option>
      <option value="7">August</option>
      <option value="8">September</option>
      <option value="9">Oktober</option>
      <option value="10">November</option>
      <option value="11">Dezember</option>
    </select>
  </div>
</section>
      <section className="space-y-3">
        <h2 className="text-sm font-black text-slate-700">
          Einnahmen ({filteredIncomes.length})
        </h2>

        {filteredIncomes.length === 0 ? (
          <div className="rounded-3xl bg-white p-5 text-sm font-bold text-slate-500 shadow-sm">
            Noch keine Einnahmen erfasst.
          </div>
        ) : (
          filteredIncomes.map((income) => {
            const id = `income-${income.id}`
            const isOpen = openId === id
            const isDeleting = deletingId === income.id

            return (
              <div
                key={id}
                role="button"
                tabIndex={0}
                onClick={() => setOpenId(isOpen ? null : id)}
                className="w-full rounded-3xl bg-white p-4 text-left shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black">{income.title || 'Einnahme'}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {income.client || 'Kein Kunde'} ·{' '}
                      {formatDate(income.date)}
                    </p>
                  </div>

                  <p className="font-black text-emerald-700">
                    +{formatEuro(income.amount)}
                  </p>
                </div>

                {isOpen && (
                  <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
                    <p>Kunde: {income.client || 'Nicht angegeben'}</p>
                    <p>Datum: {formatDate(income.date)}</p>
                    {income.note && <p>Notiz: {income.note}</p>}

                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteIncome(income.id)
                      }}
                      className="mt-3 rounded-2xl bg-rose-50 px-4 py-2 text-sm font-black text-rose-600 disabled:opacity-50"
                    >
                      {isDeleting ? 'Lösche...' : 'Löschen'}
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-black text-slate-700">
          Ausgaben ({filteredExpenses.length})
        </h2>

      {filteredExpenses.length === 0 ? (
          <div className="rounded-3xl bg-white p-5 text-sm font-bold text-slate-500 shadow-sm">
            Noch keine Ausgaben erfasst.
          </div>
        ) : (
          filteredExpenses.map((expense) => {
            const id = `expense-${expense.id}`
            const isOpen = openId === id
            const isDeleting = deletingId === expense.id

            return (
              <div
                key={id}
                role="button"
                tabIndex={0}
                onClick={() => setOpenId(isOpen ? null : id)}
                className="w-full rounded-3xl bg-white p-4 text-left shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black">
                      {expense.title || expense.vendor || 'Ausgabe'}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {expense.category || 'Sonstiges'} ·{' '}
                      {formatDate(expense.date)}
                    </p>
                  </div>

                  <p className="font-black text-rose-700">
                    -{formatEuro(expense.amount)}
                  </p>
                </div>

                {isOpen && (
                  <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
                    <p>Händler: {expense.vendor || 'Nicht angegeben'}</p>
                    <p>Kategorie: {expense.category || 'Sonstiges'}</p>
                    <p>Datum: {formatDate(expense.date)}</p>
                    {expense.note && <p>Notiz: {expense.note}</p>}

                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteExpense(expense.id)
                      }}
                      className="mt-3 rounded-2xl bg-rose-50 px-4 py-2 text-sm font-black text-rose-600 disabled:opacity-50"
                    >
                      {isDeleting ? 'Lösche...' : 'Löschen'}
                    </button>
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
