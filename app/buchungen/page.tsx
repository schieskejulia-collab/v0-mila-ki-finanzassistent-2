'use client'

import Link from 'next/link'
import { useFinance } from '@/lib/store'

function formatEuro(value: number | string) {
  const number = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))

  return (Number.isFinite(number) ? number : 0).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString('de-DE')
  } catch {
    return value
  }
}

export default function BuchungenPage() {
  const { expenses, incomes, deleteExpense, deleteIncome, summary } = useFinance()

  return (
    <main className="min-h-screen space-y-6 bg-[#fbf9ff] p-4 text-slate-950">
      <section className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Buchungen</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Deine Einnahmen und Ausgaben.
          </p>
        </div>

        <Link
          href="/neue-buchungen"
          className="rounded-3xl bg-violet-600 px-4 py-3 text-sm font-black text-white shadow-sm"
        >
          +
        </Link>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">Einnahmen</p>
          <p className="mt-1 text-sm font-black text-emerald-700">
            {formatEuro(summary.totalIncomes)}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">Ausgaben</p>
          <p className="mt-1 text-sm font-black text-rose-700">
            {formatEuro(summary.totalExpenses)}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">Saldo</p>
          <p className="mt-1 text-sm font-black text-violet-700">
            {formatEuro(summary.balance)}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
          Einnahmen
        </h2>

        {incomes.length === 0 ? (
          <div className="rounded-[2rem] bg-white p-5
