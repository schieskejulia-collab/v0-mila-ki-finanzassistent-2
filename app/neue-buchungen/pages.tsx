'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFinance } from '@/lib/store'

const categories = [
  'Software',
  'Reisen',
  'Weiterbildung',
  'Marketing',
  'Bürobedarf',
  'Bewirtung',
  'Versicherung',
  'Hardware',
  'Sonstiges',
]

function parseAmount(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.')
  const number = Number(normalized)
  return Number.isFinite(number) ? number : 0
}

export default function NeueBuchungPage() {
  const router = useRouter()
  const { addExpense, addIncome } = useFinance()

  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [title, setTitle] = useState('')
  const [partner, setPartner] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Software')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState('')

  const saveBooking = () => {
    setError('')

    const finalAmount = parseAmount(amount)

    if (!title.trim()) {
      setError('Bitte gib einen Titel ein.')
      return
    }

    if (finalAmount <= 0) {
      setError('Bitte gib einen gültigen Betrag ein.')
      return
    }

    if (type === 'expense') {
      addExpense({
        title: title.trim(),
        vendor: partner.trim(),
        amount: finalAmount,
        category,
        date,
      })
    } else {
      addIncome({
        title: title.trim(),
        client: partner.trim(),
        amount: finalAmount,
        date,
      })
    }

    router.push('/buchungen')
  }

  return (
    <main className="min-h-screen bg-[#fbf9ff] p-4 text-slate-950">
      <section className="mb-6 pt-2">
        <h1 className="text-3xl font-black tracking-tight">Neue Buchung</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Erfasse Einnahmen und Ausgaben für Mila.
        </p>
      </section>

      <section className="space-y-5 rounded-[2rem] bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-2 rounded-3xl bg-violet-50 p-1">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={
              type === 'expense'
                ? 'rounded-3xl bg-rose-600 px-4 py-3 text-sm font-black text-white'
                : 'rounded-3xl px-4 py-3 text-sm font-black text-rose-700'
            }
          >
            Ausgabe
          </button>

          <button
            type="button"
            onClick={() => setType('income')}
            className={
              type === 'income'
                ? 'rounded-3xl bg-emerald-600 px-4 py-3 text-sm font-black text-white'
                : 'rounded-3xl px-4 py-3 text-sm font-black text-emerald-700'
            }
          >
            Einnahme
          </button>
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Titel
          </span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={type === 'expense' ? 'z.B. Canva Pro' : 'z.B. Kundenprojekt'}
            className="w-full rounded-3xl border border-violet-100 bg-violet-50 px-4 py-4 text-base font-bold outline-none focus:border-violet-500"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            {type === 'expense' ? 'Anbieter' : 'Kunde'}
          </span>
          <input
            value={partner}
            onChange={(event) => setPartner(event.target.value)}
            placeholder={type === 'expense' ? 'z.B. Canva' : 'z.B. Max Mustermann'}
            className="w-full rounded-3xl border border-violet-100 bg-violet-50 px-4 py-4 text-base font-bold outline-none focus:border-violet-500"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Betrag
          </span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className="w-full rounded-3xl border border-violet-100 bg-violet-50 px-4 py-4 text-base font-bold outline-none focus:border-violet-500"
          />
        </label>

        {type === 'expense' && (
          <label className="block space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Kategorie
            </span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-3xl border border-violet-100 bg-violet-50 px-4 py-4 text-base font-bold outline-none focus:border-violet-500"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block space-y-2">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Datum
          </span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-full rounded-3xl border border-violet-100 bg-violet-50 px-4 py-4 text-base font-bold outline-none focus:border-violet-500"
