'use client'

import { useState } from 'react'
import { useFinance } from '@/lib/store'
import type { Obligation } from '@/lib/mila-obligations'

function money(value: number) {
  return Number(value || 0).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

export default function VerpflichtungenPage() {
  const finance = useFinance()

  const obligations = finance.obligations || []
  const addObligation = finance.addObligation
  const deleteObligation = finance.deleteObligation

  const [title, setTitle] = useState('')
  const [partner, setPartner] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] =
    useState<Obligation['priority']>('normal')

  function speichern() {
    if (!title.trim() || !amount.trim() || !dueDate) {
      alert('Bitte Titel, Betrag und Datum eintragen 🪬')
      return
    }

    const item: Obligation = {
      id: crypto.randomUUID(),
      title: title.trim(),
      partner: partner.trim(),
      creditor: partner.trim() as any,
      amount: Number(String(amount).replace(',', '.')),
      type: 'rechnung',
      area: 'privat',
      dueDate,
      due_date: dueDate as any,
      status: 'offen',
      priority,
      reminderDays: [14, 3, 0],
      reminder_days: 3 as any,
    }

    addObligation(item)

    setTitle('')
    setPartner('')
    setAmount('')
    setDueDate('')
    setPriority('normal')
  }

  return (
    <main className="min-h-screen max-w-md mx-auto p-6 pb-32 space-y-5">
      <h1 className="text-4xl font-black">🧾 Verpflichtungen</h1>

      <section className="rounded-[2rem] bg-white p-5 shadow space-y-3">
        <input className="w-full rounded-2xl border p-4" placeholder="Rechnung / Rate / Frist" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="w-full rounded-2xl border p-4" placeholder="Gläubiger / Anbieter" value={partner} onChange={(e) => setPartner(e.target.value)} />
        <input className="w-full rounded-2xl border p-4" placeholder="Betrag" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
       <input
  className="block w-full max-w-full rounded-2xl border p-4"
  type="date"
  value={dueDate}
  onChange={(e) => setDueDate(e.target.value)}
/>

        <select className="w-full rounded-2xl border p-4" value={priority} onChange={(e) => setPriority(e.target.value as Obligation['priority'])}>
          <option value="existenz">🔴 Existenz wichtig</option>
          <option value="wichtig">🟡 Wichtig</option>
          <option value="normal">🟢 Normal</option>
        </select>

        <button onClick={speichern} className="w-full rounded-2xl bg-purple-600 py-4 font-black text-white">
          Verpflichtung speichern
        </button>
      </section>

      <section className="space-y-3">
        {obligations.length === 0 ? (
          <div className="rounded-3xl bg-purple-50 p-5 font-bold text-slate-700">
            Noch keine Verpflichtungen hinterlegt.
          </div>
        ) : (
          obligations.map((item: any) => (
            <div key={item.id} className="rounded-3xl bg-white p-5 shadow">
              <p className="text-xl font-black">{item.title}</p>
              <p className="text-sm font-semibold text-slate-500">{item.partner || item.creditor}</p>
              <p className="mt-2 text-2xl font-black text-purple-700">{money(item.amount)}</p>
              <p className="text-sm text-slate-500">Fällig: {item.dueDate || item.due_date}</p>

              <button onClick={() => deleteObligation(item.id)} className="mt-3 text-sm font-bold text-red-500">
                Löschen
              </button>
            </div>
          ))
        )}
      </section>
    </main>
  )
}